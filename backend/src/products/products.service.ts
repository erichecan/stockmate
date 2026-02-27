// Updated: 2026-02-27T04:30:00
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto, PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        description: dto.description,
        descriptionEn: dto.descriptionEn,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        status: dto.status,
        images: dto.images,
        tenantId,
      },
      include: { category: true, brand: true },
    });
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId },
        skip,
        take: limit,
        include: { category: true, brand: true, _count: { select: { skus: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: { tenantId } }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        brand: true,
        skus: { where: { isActive: true }, orderBy: { code: 'asc' } },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, tenantId: string, dto: UpdateProductDto) {
    await this.findOne(id, tenantId);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, brand: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'DISCONTINUED' },
    });
  }
}
