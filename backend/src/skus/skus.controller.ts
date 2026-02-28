// Updated: 2026-02-27T04:30:00
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { BulkCreateSkuDto } from './dto/bulk-create-sku.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('SKUs')
@ApiBearerAuth()
@Controller('skus')
export class SkusController {
  constructor(private skusService: SkusService) {}

  @Post()
  @ApiOperation({ summary: 'Create a single SKU' })
  @ApiResponse({ status: 201, description: 'SKU created' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateSkuDto,
  ) {
    return this.skusService.create(tenantId, dto);
  }

  @Post('bulk')
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
  @ApiOperation({ summary: 'Update SKU' })
  @ApiResponse({ status: 200, description: 'SKU updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateSkuDto,
  ) {
    return this.skusService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate SKU (soft delete)' })
  @ApiResponse({ status: 200, description: 'SKU deactivated' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.skusService.remove(id, tenantId);
  }
}
