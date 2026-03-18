// Updated: 2026-02-27T04:30:00
// Updated: 2026-03-17T14:31:00 - SKU MOQ API + getResolvedMoq
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { BulkCreateSkuDto } from './dto/bulk-create-sku.dto';
import { BatchUpdateSkuMoqDto } from './dto/batch-update-sku-moq.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../common/dto/pagination.dto';

/** Sku 或含 moq/minOrderQty 的对象 */
type SkuLike = { moq?: number | null; minOrderQty?: number | null };

@Injectable()
export class SkusService {
  constructor(private prisma: PrismaService) {}

  /**
   * 优先读 moq，fallback 到 minOrderQty，默认 1
   * Updated: 2026-03-17T14:31:00
   */
  getResolvedMoq(sku: SkuLike): number {
    const v = sku.moq ?? sku.minOrderQty;
    return v != null && v >= 1 ? v : 1;
  }

  async create(tenantId: string, dto: CreateSkuDto) {
    const code = await this.generateSkuCode(
      tenantId,
      dto.productId,
      dto.variantAttributes,
    );

    return this.prisma.sku.create({
      data: {
        code,
        productId: dto.productId,
        tenantId,
        variantAttributes: dto.variantAttributes,
        barcode: dto.barcode,
        costPrice: dto.costPrice,
        wholesalePrice: dto.wholesalePrice,
        retailPrice: dto.retailPrice,
        weight: dto.weight,
        images: dto.images,
      },
      include: { product: true },
    });
  }

  /**
   * Auto-generate SKU code: BRAND_CODE-CATEGORY_CODE-ATTR1-ATTR2
   * e.g. AP-CASE-SIL-BLU
   */
  async generateSkuCode(
    tenantId: string,
    productId: string,
    variantAttributes: Record<string, string>,
  ): Promise<string> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { brand: true, category: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const parts: string[] = [];

    if (product.brand) {
      parts.push(product.brand.code);
    }

    parts.push(product.category.code);

    const attrValues = Object.values(variantAttributes);
    for (const val of attrValues) {
      parts.push(val.substring(0, 3).toUpperCase());
    }

    const baseCode = parts.join('-');

    const existing = await this.prisma.sku.count({
      where: { code: { startsWith: baseCode }, tenantId },
    });

    return existing > 0 ? `${baseCode}-${existing + 1}` : baseCode;
  }

  async findAll(tenantId: string, pagination: PaginationDto, search?: string) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.SkuWhereInput = { tenantId, isActive: true };
    if (search?.trim()) {
      where.OR = [
        { code: { contains: search.trim(), mode: 'insensitive' } },
        { product: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.sku.findMany({
        where,
        skip,
        take: limit,
        include: { product: { include: { category: true, brand: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sku.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findByProduct(productId: string, tenantId: string) {
    return this.prisma.sku.findMany({
      where: { productId, tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const sku = await this.prisma.sku.findFirst({
      where: { id, tenantId },
      include: { product: { include: { category: true, brand: true } } },
    });
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }
    return sku;
  }

  async update(id: string, tenantId: string, dto: UpdateSkuDto) {
    await this.findOne(id, tenantId);
    return this.prisma.sku.update({
      where: { id },
      data: dto,
      include: { product: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.sku.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Updated: 2026-03-17T14:31:00 - PATCH /skus/:id/moq */
  async updateMoq(id: string, tenantId: string, moq: number) {
    await this.findOne(id, tenantId);
    return this.prisma.sku.update({
      where: { id },
      data: { moq },
      include: { product: true },
    });
  }

  /** Updated: 2026-03-17T14:31:00 - PATCH /skus/moq/batch，事务执行 */
  async batchUpdateMoq(tenantId: string, dto: BatchUpdateSkuMoqDto) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of dto.items) {
        const sku = await tx.sku.findFirst({
          where: { id: item.skuId, tenantId },
        });
        if (!sku) {
          throw new NotFoundException(`SKU ${item.skuId} not found`);
        }
        const updated = await tx.sku.update({
          where: { id: item.skuId },
          data: { moq: item.moq },
          include: { product: true },
        });
        results.push(updated);
      }
      return results;
    });
  }

  async bulkCreate(tenantId: string, dto: BulkCreateSkuDto) {
    const results = [];

    for (const variant of dto.variants) {
      const code = await this.generateSkuCode(
        tenantId,
        dto.productId,
        variant.attributes,
      );

      const sku = await this.prisma.sku.create({
        data: {
          code,
          productId: dto.productId,
          tenantId,
          variantAttributes: variant.attributes,
          costPrice: variant.costPrice,
          wholesalePrice: variant.wholesalePrice,
          retailPrice: variant.retailPrice,
        },
        include: { product: true },
      });

      results.push(sku);
    }

    return results;
  }
}
