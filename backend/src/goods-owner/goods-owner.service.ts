// 货主服务；参考 ModernWMS GoodsownerService
// Updated: 2026-03-14
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreateGoodsOwnerDto } from './dto/create-goods-owner.dto';
import { UpdateGoodsOwnerDto } from './dto/update-goods-owner.dto';

@Injectable()
export class GoodsOwnerService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateGoodsOwnerDto) {
    const existing = await this.prisma.goodsOwner.findUnique({
      where: { code_tenantId: { code: dto.code, tenantId } },
    });
    if (existing) {
      throw new ConflictException(`货主编码 "${dto.code}" 已存在`);
    }
    return this.prisma.goodsOwner.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        city: dto.city,
        address: dto.address,
        contactName: dto.contactName,
        contactTel: dto.contactTel,
        isActive: dto.isActive ?? true,
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
    const where: Prisma.GoodsOwnerWhereInput = { tenantId };
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { code: { contains: search.trim(), mode: 'insensitive' } },
        { contactName: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.goodsOwner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.goodsOwner.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findAllList(tenantId: string) {
    return this.prisma.goodsOwner.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const row = await this.prisma.goodsOwner.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('货主不存在');
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateGoodsOwnerDto) {
    await this.findOne(id, tenantId);
    if (dto.code != null) {
      const existing = await this.prisma.goodsOwner.findFirst({
        where: { tenantId, code: dto.code, id: { not: id } },
      });
      if (existing) throw new ConflictException(`货主编码 "${dto.code}" 已存在`);
    }
    return this.prisma.goodsOwner.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code != null && { code: dto.code }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.contactTel !== undefined && { contactTel: dto.contactTel }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.goodsOwner.delete({ where: { id } });
  }
}
