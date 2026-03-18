// Updated: 2026-03-17T12:00:00 - 后端第三部分：到柜预报 forecast/status/items-with-stock
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { AddPackingItemsDto } from './dto/add-packing-items.dto';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import {
  ReceiptIdsDto,
  PutawayCompleteDto,
} from './dto/receipt-phase-actions.dto';
import { PatchShipmentStatusDto } from './dto/patch-shipment-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { POStatus } from '@prisma/client';

@ApiTags('Purchasing')
@ApiBearerAuth()
@Controller('purchasing')
export class PurchasingController {
  constructor(private purchasingService: PurchasingService) {}

  // ==================== Purchase Orders ====================

  @Post('orders')
  @ApiOperation({ summary: 'Create a purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async createPO(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasingService.createPO(tenantId, userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List purchase orders with pagination' })
  @ApiQuery({ name: 'status', required: false, enum: POStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Purchase orders list returned' })
  async findAllPOs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: POStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.purchasingService.findAllPOs(
      tenantId,
      status,
      pageNum,
      limitNum,
    );
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  @ApiResponse({ status: 200, description: 'Purchase order returned' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async findOnePO(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.purchasingService.findOnePO(id, tenantId);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order updated' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async updatePO(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchasingService.updatePO(id, tenantId, userId, dto);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async cancelPO(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.purchasingService.cancelPO(id, tenantId, userId);
  }

  // ==================== Shipments ====================

  @Post('shipments')
  @ApiOperation({ summary: 'Create a shipment for a purchase order' })
  @ApiResponse({ status: 201, description: 'Shipment created' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async createShipment(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.purchasingService.createShipment(tenantId, dto);
  }

  @Patch('shipments/:id')
  @ApiOperation({ summary: 'Update shipment' })
  @ApiResponse({ status: 200, description: 'Shipment updated' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async updateShipment(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.purchasingService.updateShipment(id, tenantId, dto);
  }

  @Get('shipments')
  @ApiOperation({ summary: 'List shipments' })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiResponse({ status: 200, description: 'Shipments list returned' })
  async findShipments(
    @CurrentUser('tenantId') tenantId: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
  ) {
    return this.purchasingService.findShipments(tenantId, purchaseOrderId);
  }

  @Get('shipments/forecast')
  @ApiOperation({ summary: '到柜预报：即将到港/到仓的 shipments' })
  @ApiResponse({ status: 200, description: 'Forecast shipments list' })
  async getShipmentsForecast(@CurrentUser('tenantId') tenantId: string) {
    return this.purchasingService.getShipmentsForecast(tenantId);
  }

  @Patch('shipments/:id/status')
  @ApiOperation({ summary: 'Update shipment status' })
  @ApiResponse({ status: 200, description: 'Shipment status updated' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async patchShipmentStatus(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: PatchShipmentStatusDto,
  ) {
    return this.purchasingService.patchShipmentStatus(id, tenantId, dto.status);
  }

  @Get('shipments/:id/items-with-stock')
  @ApiOperation({
    summary: 'Packing list items with current inventory availability',
  })
  @ApiResponse({ status: 200, description: 'Items with stock availability' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async getShipmentItemsWithStock(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.purchasingService.getShipmentItemsWithStock(id, tenantId);
  }

  // ==================== Packing Lists ====================

  @Post('shipments/:shipmentId/packing')
  @ApiOperation({ summary: 'Add packing list items to a shipment' })
  @ApiResponse({ status: 201, description: 'Packing items added' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async addPackingItems(
    @Param('shipmentId') shipmentId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: AddPackingItemsDto,
  ) {
    return this.purchasingService.addPackingItems(
      shipmentId,
      tenantId,
      dto.items,
    );
  }

  // ==================== Receipts ====================

  @Post('receipts')
  @ApiOperation({ summary: 'Create a purchase receipt' })
  @ApiResponse({ status: 201, description: 'Receipt created' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async createReceipt(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateReceiptDto,
  ) {
    return this.purchasingService.createReceipt(tenantId, userId, dto);
  }

  @Get('receipts')
  @ApiOperation({ summary: 'List purchase receipts' })
  @ApiQuery({ name: 'purchaseOrderId', required: false })
  @ApiResponse({ status: 200, description: 'Receipts list returned' })
  async findReceipts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
  ) {
    return this.purchasingService.findReceipts(tenantId, purchaseOrderId);
  }

  // ==================== 阶段二：收货 6 状态/6 Tab（参考 ModernWMS Asn）====================
  // 2026-03-14

  @Get('receipts/by-phase')
  @ApiOperation({ summary: '按阶段分页查询收货列表（6 Tab）' })
  @ApiQuery({
    name: 'phase',
    required: true,
    description: 'NOTICE|PENDING_ARRIVAL|ARRIVED|UNLOADED|SORTED|COMPLETED',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '分页收货列表' })
  async listReceiptsByPhase(
    @CurrentUser('tenantId') tenantId: string,
    @Query('phase') phase: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.purchasingService.listReceiptsByPhase(
      tenantId,
      phase || 'NOTICE',
      pageNum,
      limitNum,
    );
  }

  @Put('receipts/confirm-arrival')
  @ApiOperation({ summary: '确认到货（待到货 -> 待卸货）' })
  @ApiResponse({ status: 200, description: 'Updated count' })
  async confirmArrival(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ReceiptIdsDto,
  ) {
    return this.purchasingService.confirmArrival(tenantId, dto.receiptIds);
  }

  @Put('receipts/confirm-unload')
  @ApiOperation({ summary: '确认卸货（待卸货 -> 待分拣）' })
  @ApiResponse({ status: 200, description: 'Updated count' })
  async confirmUnload(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ReceiptIdsDto,
  ) {
    return this.purchasingService.confirmUnload(tenantId, dto.receiptIds);
  }

  @Put('receipts/sorting-complete')
  @ApiOperation({ summary: '分拣完成（待分拣 -> 待上架）' })
  @ApiResponse({ status: 200, description: 'Updated count' })
  async sortingComplete(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ReceiptIdsDto,
  ) {
    return this.purchasingService.sortingComplete(tenantId, dto.receiptIds);
  }

  @Put('receipts/:id/putaway')
  @ApiOperation({ summary: '上架完成（待上架 -> 已完成，并调用库存入库）' })
  @ApiResponse({ status: 200, description: 'Putaway completed' })
  async putawayComplete(
    @Param('id') receiptId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: PutawayCompleteDto,
  ) {
    return this.purchasingService.putawayComplete(
      tenantId,
      userId,
      receiptId,
      dto,
    );
  }
}
