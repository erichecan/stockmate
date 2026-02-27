// Updated: 2026-02-27T04:30:00
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { BulkCreateSkuDto } from './dto/bulk-create-sku.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class SkusService {
  constructor(private prisma: PrismaService) {}

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

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.sku.findMany({
        where: { tenantId, isActive: true },
        skip,
        take: limit,
        include: { product: { include: { category: true, brand: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sku.count({ where: { tenantId, isActive: true } }),
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
