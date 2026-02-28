// Updated: 2026-02-28T10:00:00
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({
      where: { code_tenantId: { code: dto.code, tenantId } },
    });
    if (existing) {
      throw new ConflictException(`Supplier code "${dto.code}" already exists`);
    }

    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        code: dto.code,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        country: dto.country,
        paymentTerms: dto.paymentTerms,
        leadTimeDays: dto.leadTimeDays,
        tenantId,
      },
    });
  }

  async findAll(
    tenantId: string,
    search?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = { tenantId };
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { code: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async update(id: string, tenantId: string, dto: UpdateSupplierDto) {
    await this.findOne(id, tenantId);

    if (dto.code) {
      const existing = await this.prisma.supplier.findFirst({
        where: { code: dto.code, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Supplier code "${dto.code}" already exists`);
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
