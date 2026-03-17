// Updated: 2026-03-14T16:10:00 - 批发站 P0: 登录后商品列表/详情（含价格/起订量/库存状态）
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from '../products/products.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  PublicProductListItemDto,
  PublicProductDetailDto,
  WholesaleProductListItemDto,
  WholesaleProductDetailDto,
  WholesaleSkuDto,
} from './dto/wholesale-product.dto';

const LOW_STOCK_THRESHOLD = 10;

function mapAvailableToStatus(available: number) {
  if (available <= 0) return 'OUT_OF_STOCK' as const;
  if (available < LOW_STOCK_THRESHOLD) return 'LOW_STOCK' as const;
  return 'IN_STOCK' as const;
}

@ApiTags('Wholesale Products')
@ApiBearerAuth()
@Controller('wholesale')
export class WholesaleProductsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly inventoryService: InventoryService,
  ) {}

  // Updated: 2026-03-17T00:21:00 - P0 闭环: 公共端点也加分页
  @Get('public/products')
  @Public()
  @ApiOperation({ summary: 'Public product list for wholesale site (no price/stock)' })
  @ApiQuery({ name: 'tenantSlug', required: true })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Search keyword' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPublicProducts(
    @Query('tenantSlug') tenantSlug: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PublicProductListItemDto[]> {
    // 2026-03-15 修复：缺失 tenantSlug 时直接返回空数组，避免 trim 报错导致加载失败
    if (!tenantSlug?.trim()) {
      return [];
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug.trim() },
    });
    if (!tenant) {
      return [];
    }

    const where: any = {
      tenantId: tenant.id,
      status: 'ACTIVE',
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (q?.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const products = await this.prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      images: Array.isArray(p.images) ? (p.images as string[]) : undefined,
      categoryName: p.category?.name ?? null,
      brandName: p.brand?.name ?? null,
    }));
  }

  @Get('public/products/:id')
  @Public()
  @ApiOperation({ summary: 'Public product detail for wholesale site (no price/stock)' })
  @ApiQuery({ name: 'tenantSlug', required: true })
  async getPublicProductDetail(
    @Param('id') id: string,
    @Query('tenantSlug') tenantSlug: string,
  ): Promise<PublicProductDetailDto | null> {
    if (!tenantSlug?.trim()) {
      return null;
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug.trim() },
    });
    if (!tenant) {
      return null;
    }

    const product = await this.productsService.findOne(id, tenant.id);
    return {
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      images: Array.isArray(product.images)
        ? (product.images as string[])
        : undefined,
      categoryName: product.category?.name ?? null,
      brandName: product.brand?.name ?? null,
      description: product.description,
      descriptionEn: product.descriptionEn,
    };
  }

  // Updated: 2026-03-17T00:20:00 - P0 闭环: 添加分页避免 N+1 查询超时
  @Get('products')
  @ApiOperation({
    summary: 'Wholesale product list for logged-in customer (with price/stock/minOrderQty)',
  })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWholesaleProducts(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<WholesaleProductListItemDto[]> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      return [];
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      tenantId,
      status: 'ACTIVE',
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (q?.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        skus: { where: { isActive: true }, orderBy: { code: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    });

    const result: WholesaleProductListItemDto[] = [];

    for (const p of products) {
      const skus: WholesaleSkuDto[] = [];
      for (const sku of p.skus) {
        const summary = await this.inventoryService.getSkuInventorySummary(
          tenantId,
          sku.id,
        );
        const unitPrice = this.salesOrdersService.getUnitPrice(
          sku.wholesalePrice,
          customer.tier,
        );
        const minOrderQty = sku.minOrderQty ?? 1;
        skus.push({
          id: sku.id,
          code: sku.code,
          variantAttributes: sku.variantAttributes as Record<string, string>,
          wholesalePrice: unitPrice,
          minOrderQty,
          stockStatus: mapAvailableToStatus(summary.available),
        });
      }

      result.push({
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        images: Array.isArray(p.images)
          ? (p.images as string[])
          : undefined,
        categoryName: p.category?.name ?? null,
        brandName: p.brand?.name ?? null,
        skus,
      });
    }

    return result;
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Wholesale product detail for logged-in customer (with price/stock/minOrderQty)',
  })
  async getWholesaleProductDetail(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('customerId') customerId: string,
  ): Promise<WholesaleProductDetailDto | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      return null;
    }

    const product = await this.productsService.findOne(id, tenantId);
    const skus: WholesaleSkuDto[] = [];
    for (const sku of product.skus) {
      const summary = await this.inventoryService.getSkuInventorySummary(
        tenantId,
        sku.id,
      );
      const unitPrice = this.salesOrdersService.getUnitPrice(
        sku.wholesalePrice,
        customer.tier,
      );
      const minOrderQty = (sku as any).minOrderQty ?? 1;
      skus.push({
        id: sku.id,
        code: sku.code,
        variantAttributes: sku.variantAttributes as Record<string, string>,
        wholesalePrice: unitPrice,
        minOrderQty,
        stockStatus: mapAvailableToStatus(summary.available),
      });
    }

    return {
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      images: Array.isArray(product.images)
        ? (product.images as string[])
        : undefined,
      categoryName: product.category?.name ?? null,
      brandName: product.brand?.name ?? null,
      description: product.description,
      descriptionEn: product.descriptionEn,
      skus,
    };
  }
}

