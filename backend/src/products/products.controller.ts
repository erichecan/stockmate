// Updated: 2026-02-27T04:30:00
// Updated: 2026-03-20T16:35:00 - 写操作限制为商品/网站管理相关岗位（含 CATALOG_ADMIN），零售商只读 GET
// Updated: 2026-03-20T20:18:00 - 列表支持 search 模糊匹配名称
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CATALOG_MAINTENANCE_ROLES } from '../common/constants/catalog-maintenance-roles';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Create a new product (SPU)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination' })
  @ApiResponse({ status: 200, description: 'Products list returned' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(tenantId, pagination, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (includes SKUs)' })
  @ApiResponse({ status: 200, description: 'Product returned' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.productsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...CATALOG_MAINTENANCE_ROLES)
  @ApiOperation({ summary: 'Discontinue product (soft delete)' })
  @ApiResponse({ status: 200, description: 'Product discontinued' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.productsService.remove(id, tenantId);
  }
}
