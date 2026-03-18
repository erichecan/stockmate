// Updated: 2026-03-17T14:30:00 - 批发 DRAFT：pay、PATCH items、预售限购校验
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  Patch,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrderSource, SOStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { WholesaleOrdersService } from './wholesale-orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateWholesaleOrderFromCartDto,
  PatchDraftItemsDto,
} from './dto/wholesale-orders.dto';

@ApiTags('Wholesale Orders')
@ApiBearerAuth()
@Controller('wholesale/orders')
export class WholesaleOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly wholesaleOrdersService: WholesaleOrdersService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      '从当前购物车生成一笔批发站订单（source=WHOLESALE_SITE），成功后清空购物车',
  })
  async createFromCart(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Body() body: CreateWholesaleOrderFromCartDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const cartItems = await this.prisma.wholesaleCartItem.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'asc' },
    });
    if (!cartItems.length) {
      throw new BadRequestException('Cart is empty');
    }

    let warehouseId = body.warehouseId;
    if (warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId, isActive: true },
      });
      if (!warehouse) {
        throw new BadRequestException('Invalid warehouse');
      }
    } else {
      const defaultWarehouse = await this.prisma.warehouse.findFirst({
        where: { tenantId, isDefault: true, isActive: true },
      });
      const fallbackWarehouse =
        defaultWarehouse ??
        (await this.prisma.warehouse.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'asc' },
        }));
      if (!fallbackWarehouse) {
        throw new BadRequestException('No active warehouse configured');
      }
      warehouseId = fallbackWarehouse.id;
    }

    const items = cartItems.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
    }));

    await this.wholesaleOrdersService.validatePreorderLimits(
      tenantId,
      customerId,
      items,
    );

    const createDto = {
      customerId,
      warehouseId,
      currency: 'EUR',
      notes: body.notes,
      items,
    };

    const order = await this.salesOrdersService.create(
      tenantId,
      createDto,
      OrderSource.WHOLESALE_SITE,
    );

    await this.prisma.wholesaleCartItem.deleteMany({
      where: { tenantId, customerId },
    });

    return order;
  }

  @Get()
  @ApiOperation({
    summary: '获取当前客户的订单列表（强制按 customerId 过滤）',
  })
  @ApiQuery({ name: 'status', required: false, enum: SOStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMyOrders(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.salesOrdersService.findAll(tenantId, {
      status: status as SOStatus | undefined,
      customerId,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取订单详情（必须校验订单归属当前 customer，否则返回 404）',
  })
  async findMyOrderDetail(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
  ) {
    const order = await this.salesOrdersService.findOne(id, tenantId);
    if (order.customerId !== customerId) {
      throw new NotFoundException('Sales order not found');
    }
    return order;
  }

  @Post(':id/pay')
  @ApiOperation({
    summary: 'DRAFT 订单支付，转为 PENDING 进入正式流程',
  })
  async payDraft(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
  ) {
    return this.wholesaleOrdersService.payDraft(id, tenantId, customerId);
  }

  @Patch(':id/items')
  @ApiOperation({
    summary: '编辑 DRAFT 订单行（全量覆盖 items）',
  })
  async patchDraftItems(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Body() body: PatchDraftItemsDto,
  ) {
    return this.wholesaleOrdersService.patchDraftItems(
      id,
      tenantId,
      customerId,
      body.items,
    );
  }
}
