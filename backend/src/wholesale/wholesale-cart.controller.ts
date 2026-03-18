// Updated: 2026-03-14T17:20:00 - 批发站 P0: 购物车接口（按租户/客户维度）
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Body,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SkusService } from '../skus/skus.service';
import { InventoryService } from '../inventory/inventory.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AddCartItemDto, WholesaleCartItemDto } from './dto/wholesale-cart.dto';

const LOW_STOCK_THRESHOLD = 10;

function mapAvailableToStatus(available: number) {
  if (available <= 0) return 'OUT_OF_STOCK' as const;
  if (available < LOW_STOCK_THRESHOLD) return 'LOW_STOCK' as const;
  return 'IN_STOCK' as const;
}

@ApiTags('Wholesale Cart')
@ApiBearerAuth()
@Controller('wholesale/cart')
export class WholesaleCartController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skusService: SkusService,
    private readonly inventoryService: InventoryService,
    private readonly salesOrdersService: SalesOrdersService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '获取当前客户的购物车（含价格、起订量、库存状态）',
  })
  async getCart(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
  ): Promise<WholesaleCartItemDto[]> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      return [];
    }

    // Updated: 2026-03-16T23:32:00 - P0 闭环: include product name for frontend display
    const cartItems = await this.prisma.wholesaleCartItem.findMany({
      where: { tenantId, customerId },
      include: {
        sku: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result: WholesaleCartItemDto[] = [];

    for (const item of cartItems) {
      const sku = item.sku;
      const summary = await this.inventoryService.getSkuInventorySummary(
        tenantId,
        sku.id,
      );
      const unitPrice = await this.salesOrdersService.getUnitPrice(
        tenantId,
        sku.wholesalePrice,
        customer.tier,
      );
      const minOrderQty = this.skusService.getResolvedMoq(sku);
      const attrs = sku.variantAttributes as Record<string, string> | null;
      const variantLabel = attrs ? Object.values(attrs).join(' / ') : '';

      result.push({
        skuId: sku.id,
        skuCode: sku.code,
        productName:
          (sku as any).product?.nameEn ||
          (sku as any).product?.name ||
          sku.code,
        variantLabel,
        quantity: item.quantity,
        wholesalePrice: unitPrice,
        minOrderQty,
        stockStatus: mapAvailableToStatus(summary.available),
      });
    }

    return result;
  }

  @Post('items')
  @ApiOperation({
    summary: '新增或更新购物车行（同一 SKU 覆盖为目标数量；数量<=0 表示移除）',
  })
  async upsertCartItem(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Body() dto: AddCartItemDto,
  ): Promise<WholesaleCartItemDto[]> {
    const sku = await this.prisma.sku.findFirst({
      where: { id: dto.skuId, tenantId },
    });
    if (!sku) {
      throw new BadRequestException('SKU not found');
    }

    if (dto.quantity <= 0) {
      await this.prisma.wholesaleCartItem.deleteMany({
        where: { tenantId, customerId, skuId: dto.skuId },
      });
      return this.getCart(tenantId, customerId);
    }

    const minOrderQty = this.skusService.getResolvedMoq(sku);
    if (dto.quantity < minOrderQty && dto.quantity % minOrderQty !== 0) {
      throw new BadRequestException(
        `Quantity must be >= minOrderQty (${minOrderQty}) or a multiple of it`,
      );
    }

    await this.prisma.wholesaleCartItem.upsert({
      where: {
        tenantId_customerId_skuId: {
          tenantId,
          customerId,
          skuId: dto.skuId,
        },
      },
      create: {
        tenantId,
        customerId,
        skuId: dto.skuId,
        quantity: dto.quantity,
      },
      update: {
        quantity: dto.quantity,
      },
    });

    return this.getCart(tenantId, customerId);
  }

  @Delete('items/:skuId')
  @ApiOperation({
    summary: '删除购物车中某个 SKU（幂等）',
  })
  async removeCartItem(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Param('skuId') skuId: string,
  ): Promise<WholesaleCartItemDto[]> {
    await this.prisma.wholesaleCartItem.deleteMany({
      where: { tenantId, customerId, skuId },
    });

    return this.getCart(tenantId, customerId);
  }
}
