// Updated: 2026-02-27T04:30:00
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { code_tenantId: { code: dto.code, tenantId } },
    });
    if (existing) {
      throw new ConflictException(`Brand code "${dto.code}" already exists`);
    }

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        code: dto.code,
        logoUrl: dto.logoUrl,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.brand.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenantId },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async update(id: string, tenantId: string, dto: UpdateBrandDto) {
    await this.findOne(id, tenantId);

    if (dto.code) {
      const existing = await this.prisma.brand.findFirst({
        where: { code: dto.code, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Brand code "${dto.code}" already exists`);
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
