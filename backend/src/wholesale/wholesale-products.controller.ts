// Updated: 2026-03-14T16:10:00 - 批发站 P0: 登录后商品列表/详情（含价格/起订量/库存状态）
import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from '../products/products.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { SkusService } from '../skus/skus.service';
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
import { collectCategoryScopeIds } from './category-scope.util';

const LOW_STOCK_THRESHOLD = 10;

function mapAvailableToStatus(available: number) {
  if (available <= 0) return 'OUT_OF_STOCK' as const;
  if (available < LOW_STOCK_THRESHOLD) return 'LOW_STOCK' as const;
  return 'IN_STOCK' as const;
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMobigoDescriptionFromHtml(html: string): string | null {
  // Updated: 2026-03-19T10:43:50 - 详情页兜底：从 Mobigo 页面抓取描述并清洗
  const patterns = [
    /<div[^>]*id=["']ProductDescription["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*productdescription[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<[^>]*itemprop=["']description["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const cleaned = stripHtml(match[1]);
    if (cleaned.length >= 10) return cleaned.slice(0, 4000);
  }
  return null;
}

// Updated: 2026-03-19T10:35:45 - 统一关联商品 DTO 映射
function mapRelatedItem(product: {
  id: string;
  name: string;
  nameEn: string | null;
  images: unknown;
  categoryId: string;
  category: { name: string } | null;
  brand: { name: string } | null;
}): PublicProductListItemDto {
  return {
    id: product.id,
    name: product.name,
    nameEn: product.nameEn,
    images: Array.isArray(product.images)
      ? (product.images as string[])
      : undefined,
    categoryName: product.category?.name ?? null,
    brandName: product.brand?.name ?? null,
    categoryId: product.categoryId,
  };
}

@ApiTags('Wholesale Products')
@ApiBearerAuth()
@Controller('wholesale')
export class WholesaleProductsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly skusService: SkusService,
    private readonly inventoryService: InventoryService,
  ) {}

  private async resolveMobigoDescription(product: {
    id: string;
    description: string | null;
    tags: unknown;
    skus: Array<{ variantAttributes: unknown }>;
  }): Promise<string | null> {
    const currentDescription = (product.description || '').trim();
    const tagArray = Array.isArray(product.tags)
      ? (product.tags as string[])
      : [];
    const isMobigoProduct = tagArray.includes('MOBIGO');
    const currentIsUrl = /^https?:\/\//i.test(currentDescription);
    if (!isMobigoProduct || (currentDescription && !currentIsUrl)) {
      return product.description;
    }

    const sourceUrl = product.skus
      .map((sku) => {
        const attrs =
          sku.variantAttributes &&
          typeof sku.variantAttributes === 'object'
            ? (sku.variantAttributes as Record<string, unknown>)
            : {};
        return String(attrs.sourceUrl || '').trim();
      })
      .find((url) => /^https?:\/\//i.test(url));

    const targetUrl = sourceUrl || currentDescription;
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return product.description;
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'StockmateMobigoDescriptionBot/1.0',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return product.description;
      const html = await response.text();
      const extracted = extractMobigoDescriptionFromHtml(html);
      if (!extracted) return product.description;

      await this.prisma.product.update({
        where: { id: product.id },
        data: { description: extracted },
      });
      return extracted;
    } catch {
      return product.description;
    }
  }

  // 2026-03-17T10:07:00 - 公共端点分页 + 返回 total
  @Get('public/products')
  @Public()
  @ApiOperation({
    summary: 'Public product list for wholesale site (no price/stock)',
  })
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
  ) {
    if (!tenantSlug?.trim()) {
      return { data: [], total: 0, page: 1, limit: 50 };
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug.trim() },
    });
    if (!tenant) {
      return { data: [], total: 0, page: 1, limit: 50 };
    }

    const where: any = {
      tenantId: tenant.id,
      status: 'ACTIVE',
    };
    if (categoryId) {
      // Updated: 2026-03-19T10:23:05 - 按类目筛选时包含子孙类目，修复一级类目“无商品”问题
      const allCategories = await this.prisma.category.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { id: true, parentId: true },
      });
      const scopedCategoryIds = collectCategoryScopeIds(allCategories, categoryId);
      where.categoryId = { in: scopedCategoryIds };
    }
    if (q?.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true, brand: true },
        // Updated: 2026-03-18T23:59:30 - 默认按上架时间(创建时间)倒序，id 作为稳定次序
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.product.count({ where }),
    ]);

    const data: PublicProductListItemDto[] = products.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      images: Array.isArray(p.images) ? (p.images as string[]) : undefined,
      categoryName: p.category?.name ?? null,
      brandName: p.brand?.name ?? null,
      // Updated: 2026-03-19T10:35:45 - 返回 categoryId 给前端详情页关联推荐使用
      categoryId: p.categoryId,
    }));

    return { data, total, page: pageNum, limit: limitNum };
  }

  @Get('public/products/:id')
  @Public()
  @ApiOperation({
    summary: 'Public product detail for wholesale site (no price/stock)',
  })
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
    // Updated: 2026-03-19T10:35:45 - 详情页关联商品：同类目优先，排除当前商品，最多 8 个
    const relatedProducts = await this.prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        status: 'ACTIVE',
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: { category: true, brand: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 8,
    });

    const resolvedDescription = await this.resolveMobigoDescription(product);
    return {
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      images: Array.isArray(product.images)
        ? (product.images as string[])
        : undefined,
      categoryName: product.category?.name ?? null,
      brandName: product.brand?.name ?? null,
      categoryId: product.categoryId,
      description: resolvedDescription,
      descriptionEn: product.descriptionEn,
      relatedItems: relatedProducts.map(mapRelatedItem),
    };
  }

  // 2026-03-17T10:06:00 - 批量库存查询替代 N+1，支持分页 + 返回 total
  @Get('products')
  @ApiOperation({
    summary:
      'Wholesale product list for logged-in customer (with price/stock/minOrderQty)',
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
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      return { data: [], total: 0, page: 1, limit: 50 };
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      tenantId,
      status: 'ACTIVE',
    };
    if (categoryId) {
      // Updated: 2026-03-19T10:23:05 - 按类目筛选时包含子孙类目，修复一级类目“无商品”问题
      const allCategories = await this.prisma.category.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, parentId: true },
      });
      const scopedCategoryIds = collectCategoryScopeIds(allCategories, categoryId);
      where.categoryId = { in: scopedCategoryIds };
    }
    if (q?.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          skus: { where: { isActive: true }, orderBy: { code: 'asc' } },
        },
        // Updated: 2026-03-18T23:59:30 - 默认按上架时间(创建时间)倒序，id 作为稳定次序
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limitNum,
      }),
      this.prisma.product.count({ where }),
    ]);

    const allSkuIds = products.flatMap((p) => p.skus.map((s) => s.id));
    const availabilityMap = await this.inventoryService.getBatchSkuAvailability(
      tenantId,
      allSkuIds,
    );

    const data: WholesaleProductListItemDto[] = await Promise.all(
      products.map(async (p) => ({
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        images: Array.isArray(p.images) ? (p.images as string[]) : undefined,
        categoryName: p.category?.name ?? null,
        brandName: p.brand?.name ?? null,
        // Updated: 2026-03-19T10:35:45 - 返回 categoryId 给前端详情页关联推荐使用
        categoryId: p.categoryId,
        // Updated: 2026-03-17T14:33:00 - getUnitPrice async + moq ?? minOrderQty
        skus: await Promise.all(
          p.skus.map(async (sku) => ({
            id: sku.id,
            code: sku.code,
            variantAttributes: sku.variantAttributes as Record<string, string>,
            wholesalePrice: await this.salesOrdersService.getUnitPrice(
              tenantId,
              sku.wholesalePrice,
              customer.tier,
            ),
            minOrderQty: this.skusService.getResolvedMoq(sku),
            stockStatus: mapAvailableToStatus(availabilityMap.get(sku.id) ?? 0),
          })),
        ),
      })),
    );

    return { data, total, page: pageNum, limit: limitNum };
  }

  @Get('products/:id')
  @ApiOperation({
    summary:
      'Wholesale product detail for logged-in customer (with price/stock/minOrderQty)',
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
    // Updated: 2026-03-19T10:35:45 - 详情页关联商品：同类目优先，排除当前商品，最多 8 个
    const relatedProducts = await this.prisma.product.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: { category: true, brand: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 8,
    });

    const skus: WholesaleSkuDto[] = [];
    for (const sku of product.skus) {
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
      skus.push({
        id: sku.id,
        code: sku.code,
        variantAttributes: sku.variantAttributes as Record<string, string>,
        wholesalePrice: unitPrice,
        minOrderQty,
        stockStatus: mapAvailableToStatus(summary.available),
      });
    }

    const resolvedDescription = await this.resolveMobigoDescription(product);
    return {
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      images: Array.isArray(product.images)
        ? (product.images as string[])
        : undefined,
      categoryName: product.category?.name ?? null,
      brandName: product.brand?.name ?? null,
      categoryId: product.categoryId,
      description: resolvedDescription,
      descriptionEn: product.descriptionEn,
      skus,
      relatedItems: relatedProducts.map(mapRelatedItem),
    };
  }
}
