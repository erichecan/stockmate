// Updated: 2026-02-28T10:00:00
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { CreateBinLocationDto } from './dto/create-bin-location.dto';
import { UpdateBinLocationDto } from './dto/update-bin-location.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  @ApiResponse({ status: 409, description: 'Warehouse code already exists' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active warehouses' })
  @ApiResponse({ status: 200, description: 'Warehouses list returned' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.warehousesService.findAll(tenantId);
  }

  @Get(':warehouseId/bins')
  @ApiOperation({ summary: 'List bin locations for a warehouse' })
  @ApiResponse({ status: 200, description: 'Bin locations list returned' })
  async findBins(
    @Param('warehouseId') warehouseId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehousesService.findBins(warehouseId, tenantId);
  }

  @Post(':warehouseId/bins')
  @ApiOperation({ summary: 'Create a bin location' })
  @ApiResponse({ status: 201, description: 'Bin location created' })
  @ApiResponse({ status: 409, description: 'Bin code already exists' })
  async createBin(
    @Param('warehouseId') warehouseId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateBinLocationDto,
  ) {
    return this.warehousesService.createBin(tenantId, warehouseId, dto);
  }

  @Patch('bins/:id')
  @ApiOperation({ summary: 'Update a bin location' })
  @ApiResponse({ status: 200, description: 'Bin location updated' })
  async updateBin(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateBinLocationDto,
  ) {
    return this.warehousesService.updateBin(id, tenantId, dto);
  }

  @Delete('bins/:id')
  @ApiOperation({ summary: 'Deactivate bin location (soft delete)' })
  @ApiResponse({ status: 200, description: 'Bin location deactivated' })
  async removeBin(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehousesService.removeBin(id, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse returned' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehousesService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate warehouse (soft delete)' })
  @ApiResponse({ status: 200, description: 'Warehouse deactivated' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehousesService.remove(id, tenantId);
  }
}
