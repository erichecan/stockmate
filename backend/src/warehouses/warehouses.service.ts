// Updated: 2026-02-28T10:00:00
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { CreateBinLocationDto } from './dto/create-bin-location.dto';
import { UpdateBinLocationDto } from './dto/update-bin-location.dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({
      where: { code_tenantId: { code: dto.code, tenantId } },
    });
    if (existing) {
      throw new ConflictException(`Warehouse code "${dto.code}" already exists`);
    }

    return this.prisma.warehouse.create({
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        isDefault: dto.isDefault ?? false,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.warehouse.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return warehouse;
  }

  async update(id: string, tenantId: string, dto: UpdateWarehouseDto) {
    await this.findOne(id, tenantId);

    if (dto.code) {
      const existing = await this.prisma.warehouse.findFirst({
        where: { code: dto.code, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Warehouse code "${dto.code}" already exists`);
      }
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createBin(tenantId: string, warehouseId: string, dto: CreateBinLocationDto) {
    await this.findOne(warehouseId, tenantId);

    const existing = await this.prisma.binLocation.findUnique({
      where: { code_tenantId: { code: dto.code, tenantId } },
    });
    if (existing) {
      throw new ConflictException(`Bin code "${dto.code}" already exists`);
    }

    const barcode = dto.code;

    return this.prisma.binLocation.create({
      data: {
        code: dto.code,
        warehouseId,
        zone: dto.zone,
        aisle: dto.aisle,
        shelf: dto.shelf,
        position: dto.position,
        barcode,
        tenantId,
      },
    });
  }

  async findBins(warehouseId: string, tenantId: string) {
    await this.findOne(warehouseId, tenantId);
    return this.prisma.binLocation.findMany({
      where: { warehouseId, tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async findBinById(id: string, tenantId: string) {
    const bin = await this.prisma.binLocation.findFirst({
      where: { id, tenantId },
    });
    if (!bin) {
      throw new NotFoundException('Bin location not found');
    }
    return bin;
  }

  async updateBin(id: string, tenantId: string, dto: UpdateBinLocationDto) {
    await this.findBinById(id, tenantId);

    if (dto.code) {
      const existing = await this.prisma.binLocation.findFirst({
        where: { code: dto.code, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Bin code "${dto.code}" already exists`);
      }
    }

    return this.prisma.binLocation.update({
      where: { id },
      data: dto,
    });
  }

  async removeBin(id: string, tenantId: string) {
    await this.findBinById(id, tenantId);
    return this.prisma.binLocation.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
