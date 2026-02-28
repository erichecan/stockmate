// Updated: 2026-02-28T10:00:00
import {
  Body,
  Controller,
  Get,
  Param,
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
import { LedgerType } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InboundDto } from './dto/inbound.dto';
import { OutboundDto } from './dto/outbound.dto';
import { AdjustDto } from './dto/adjust.dto';
import { TransferDto } from './dto/transfer.dto';
import { LockInventoryDto } from './dto/lock-inventory.dto';
import { UnlockInventoryDto } from './dto/unlock-inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory with pagination' })
  @ApiQuery({ name: 'skuId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Inventory list returned' })
  async getInventory(
    @CurrentUser('tenantId') tenantId: string,
    @Query('skuId') skuId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getInventory(tenantId, {
      skuId,
      warehouseId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('sku/:skuId/summary')
  @ApiOperation({ summary: 'Get SKU inventory summary across warehouses' })
  @ApiResponse({ status: 200, description: 'SKU summary returned' })
  async getSkuSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Param('skuId') skuId: string,
  ) {
    return this.inventoryService.getSkuInventorySummary(tenantId, skuId);
  }

  @Post('inbound')
  @ApiOperation({ summary: 'Record inbound stock' })
  @ApiResponse({ status: 201, description: 'Inbound recorded' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async inbound(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: InboundDto,
  ) {
    return this.inventoryService.inbound(tenantId, userId, dto);
  }

  @Post('outbound')
  @ApiOperation({ summary: 'Record outbound stock' })
  @ApiResponse({ status: 201, description: 'Outbound recorded' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  async outbound(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: OutboundDto,
  ) {
    return this.inventoryService.outbound(tenantId, userId, dto);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Adjust inventory quantity' })
  @ApiResponse({ status: 201, description: 'Adjustment recorded' })
  async adjust(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AdjustDto,
  ) {
    return this.inventoryService.adjust(tenantId, userId, dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @ApiResponse({ status: 201, description: 'Transfer completed' })
  @ApiResponse({ status: 400, description: 'Insufficient stock at source' })
  async transfer(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TransferDto,
  ) {
    return this.inventoryService.transfer(tenantId, userId, dto);
  }

  @Post('lock')
  @ApiOperation({ summary: 'Lock inventory' })
  @ApiResponse({ status: 201, description: 'Inventory locked' })
  @ApiResponse({ status: 400, description: 'Insufficient available' })
  async lock(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: LockInventoryDto,
  ) {
    return this.inventoryService.lockInventory(tenantId, userId, dto);
  }

  @Post('unlock')
  @ApiOperation({ summary: 'Unlock inventory' })
  @ApiResponse({ status: 201, description: 'Inventory unlocked' })
  @ApiResponse({ status: 400, description: 'Insufficient locked' })
  async unlock(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UnlockInventoryDto,
  ) {
    return this.inventoryService.unlockInventory(tenantId, userId, dto);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get ledger entries with filters' })
  @ApiQuery({ name: 'skuId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: LedgerType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Ledger list returned' })
  async getLedger(
    @CurrentUser('tenantId') tenantId: string,
    @Query('skuId') skuId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: LedgerType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getLedger(tenantId, {
      skuId,
      warehouseId,
      type: type as LedgerType | undefined,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
