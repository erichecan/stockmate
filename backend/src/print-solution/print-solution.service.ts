// 打印方案服务；参考 ModernWMS PrintSolutionService，支持出库单/入库单/拣货单模板
// Updated: 2026-03-14
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrintDocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreatePrintSolutionDto } from './dto/create-print-solution.dto';
import { UpdatePrintSolutionDto } from './dto/update-print-solution.dto';

@Injectable()
export class PrintSolutionService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePrintSolutionDto) {
    return this.prisma.printSolution.create({
      data: {
        tenantId,
        documentType: dto.documentType,
        name: dto.name,
        templateBody: dto.templateBody,
        reportWidthMm: dto.reportWidthMm ?? null,
        reportHeightMm: dto.reportHeightMm ?? null,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll(
    tenantId: string,
    documentType?: PrintDocumentType,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.PrintSolutionWhereInput = { tenantId };
    if (documentType) where.documentType = documentType;

    const [data, total] = await Promise.all([
      this.prisma.printSolution.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ documentType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.printSolution.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findByDocumentType(tenantId: string, documentType: PrintDocumentType) {
    return this.prisma.printSolution.findMany({
      where: { tenantId, documentType },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const row = await this.prisma.printSolution.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('打印方案不存在');
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdatePrintSolutionDto) {
    await this.findOne(id, tenantId);
    return this.prisma.printSolution.update({
      where: { id },
      data: {
        ...(dto.documentType != null && { documentType: dto.documentType }),
        ...(dto.name != null && { name: dto.name }),
        ...(dto.templateBody != null && { templateBody: dto.templateBody }),
        ...(dto.reportWidthMm !== undefined && { reportWidthMm: dto.reportWidthMm }),
        ...(dto.reportHeightMm !== undefined && { reportHeightMm: dto.reportHeightMm }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.printSolution.delete({ where: { id } });
  }
}
