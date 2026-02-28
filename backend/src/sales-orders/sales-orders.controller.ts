// Phase 3: Sales Orders Controller
// Updated: 2026-02-28T14:20:00
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private salesOrdersService: SalesOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sales order' })
  @ApiResponse({ status: 201, description: 'Sales order created' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.salesOrdersService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sales orders with pagination' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Sales orders list returned' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.salesOrdersService.findAll(tenantId, {
      status: status as any,
      customerId,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id/pick-list')
  @ApiOperation({ summary: 'Get pick list for sales order' })
  @ApiResponse({ status: 200, description: 'Pick list returned' })
  async getPickList(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.salesOrdersService.getPickList(id, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order by ID' })
  @ApiResponse({ status: 200, description: 'Sales order returned' })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.salesOrdersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update sales order' })
  @ApiResponse({ status: 200, description: 'Sales order updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.salesOrdersService.update(id, tenantId, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm order and lock inventory' })
  @ApiResponse({ status: 200, description: 'Order confirmed' })
  async confirm(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrdersService.confirm(id, tenantId, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order and unlock inventory' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrdersService.cancel(id, tenantId, userId);
  }

  @Post(':id/fulfill')
  @ApiOperation({ summary: 'Fulfill order (outbound and complete)' })
  @ApiResponse({ status: 200, description: 'Order fulfilled' })
  async fulfill(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesOrdersService.fulfill(id, tenantId, userId);
  }
}
