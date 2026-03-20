// Updated: 2026-02-27T04:30:00
// Updated: 2026-03-17T14:31:00 - SKU MOQ PATCH endpoints
// Updated: 2026-03-20T16:35:00 - 写操作限制为商品维护岗位（含 CATALOG_ADMIN）
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkusService } from './skus.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { UpdateSkuMoqDto } from './dto/update-sku-moq.dto';
import { BatchUpdateSkuMoqDto } from './dto/batch-update-sku-moq.dto';
import { BulkCreateSkuDto } from './dto/bulk-create-sku.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CATALOG_MAINTENANCE_ROLES } from '../common/constants/catalog-maintenance-roles';

@ApiTags('SKUs')
@ApiBearerAuth()
@Controller('skus')
export class SkusController {
  constructor(private skusService: SkusService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Create a single SKU' })
  @ApiResponse({ status: 201, description: 'SKU created' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateSkuDto,
  ) {
    return this.skusService.create(tenantId, dto);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Bulk create SKUs from variant combinations' })
  @ApiResponse({ status: 201, description: 'SKUs created' })
  async bulkCreate(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: BulkCreateSkuDto,
  ) {
    return this.skusService.bulkCreate(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all SKUs with pagination' })
  @ApiResponse({ status: 200, description: 'SKUs list returned' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.skusService.findAll(tenantId, pagination, search);
  }

  @Patch('moq/batch')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Batch update SKU MOQ' })
  @ApiResponse({ status: 200, description: 'SKUs updated' })
  async batchUpdateMoq(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: BatchUpdateSkuMoqDto,
  ) {
    return this.skusService.batchUpdateMoq(tenantId, dto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'List SKUs by product' })
  @ApiResponse({ status: 200, description: 'SKUs for product returned' })
  async findByProduct(
    @Param('productId') productId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.skusService.findByProduct(productId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SKU by ID' })
  @ApiResponse({ status: 200, description: 'SKU returned' })
  @ApiResponse({ status: 404, description: 'SKU not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.skusService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Update SKU' })
  @ApiResponse({ status: 200, description: 'SKU updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateSkuDto,
  ) {
    return this.skusService.update(id, tenantId, dto);
  }

  @Patch(':id/moq')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Update SKU MOQ' })
  @ApiResponse({ status: 200, description: 'SKU MOQ updated' })
  async updateMoq(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateSkuMoqDto,
  ) {
    return this.skusService.updateMoq(id, tenantId, dto.moq);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Deactivate SKU (soft delete)' })
  @ApiResponse({ status: 200, description: 'SKU deactivated' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.skusService.remove(id, tenantId);
  }
}
