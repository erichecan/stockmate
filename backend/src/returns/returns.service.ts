// Updated: 2026-03-19T15:09:44 - 退货工作台核心服务
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReturnDisposition,
  ReturnStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnRecordDto } from './dto/create-return-record.dto';
import { QueryReturnRecordsDto } from './dto/query-return-records.dto';
import { UpdateReturnDecisionDto } from './dto/update-return-decision.dto';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  // Updated: 2026-03-19T15:09:44 - 退货入场登记（支持先登记后匹配）
  async createReturnRecord(
    tenantId: string,
    operatorUserId: string,
    dto: CreateReturnRecordDto,
  ) {
    if (dto.sourceOrderId) {
      const order = await this.prisma.salesOrder.findFirst({
        where: { id: dto.sourceOrderId, tenantId },
        select: { id: true, orderNumber: true },
      });
      if (!order) {
        throw new BadRequestException('sourceOrderId not found in current tenant');
      }
      if (!dto.sourceOrderNumber) {
        dto.sourceOrderNumber = order.orderNumber;
      }
    }

    if (dto.skuId) {
      const sku = await this.prisma.sku.findFirst({
        where: { id: dto.skuId, tenantId },
        select: { id: true },
      });
      if (!sku) {
        throw new BadRequestException('skuId not found in current tenant');
      }
    }

    return this.prisma.returnRecord.create({
      data: {
        tenantId,
        sourceOrderId: dto.sourceOrderId ?? null,
        sourceOrderNumber: dto.sourceOrderNumber ?? null,
        skuId: dto.skuId ?? null,
        returnedQty: dto.returnedQty,
        condition: dto.condition ?? 'UNKNOWN',
        status: dto.sourceOrderId && dto.skuId ? ReturnStatus.MATCHED : ReturnStatus.RECEIVED,
        disposition: ReturnDisposition.PENDING,
        issueDescription: dto.issueDescription ?? null,
        intakeNotes: dto.intakeNotes ?? null,
        receivedByUserId: operatorUserId,
      },
      include: {
        sourceOrder: { select: { id: true, orderNumber: true } },
        sku: { select: { id: true, code: true, product: { select: { name: true } } } },
      },
    });
  }

  // Updated: 2026-03-19T15:09:44 - 退货列表查询，支持订单/SKU/关键词筛选
  async queryReturnRecords(tenantId: string, query: QueryReturnRecordsDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const keyword = query.keyword?.trim();
    const orderNumber = query.orderNumber?.trim();
    const skuCode = query.skuCode?.trim();

    const where: Prisma.ReturnRecordWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.disposition ? { disposition: query.disposition } : {}),
      ...(orderNumber
        ? {
            OR: [
              { sourceOrderNumber: { contains: orderNumber, mode: 'insensitive' } },
              {
                sourceOrder: {
                  orderNumber: { contains: orderNumber, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
      ...(skuCode
        ? {
            sku: {
              code: { contains: skuCode, mode: 'insensitive' },
            },
          }
        : {}),
      ...(keyword
        ? {
            OR: [
              { issueDescription: { contains: keyword, mode: 'insensitive' } },
              { intakeNotes: { contains: keyword, mode: 'insensitive' } },
              { decisionNotes: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.returnRecord.findMany({
        where,
        include: {
          sourceOrder: { select: { id: true, orderNumber: true, status: true } },
          sku: { select: { id: true, code: true, product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.returnRecord.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Updated: 2026-03-19T15:09:44 - 查询单条退货详情
  async getReturnRecordById(tenantId: string, id: string) {
    const item = await this.prisma.returnRecord.findFirst({
      where: { id, tenantId },
      include: {
        sourceOrder: { select: { id: true, orderNumber: true, status: true } },
        sku: { select: { id: true, code: true, product: { select: { name: true } } } },
      },
    });
    if (!item) throw new NotFoundException('Return record not found');
    return item;
  }

  // Updated: 2026-03-19T15:09:44 - 退货处置决策：弃货/维修/降价销售/零售
  async updateReturnDecision(
    tenantId: string,
    operatorUserId: string,
    id: string,
    dto: UpdateReturnDecisionDto,
  ) {
    const existing = await this.prisma.returnRecord.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException('Return record not found');

    const nextStatus =
      dto.status ??
      (dto.disposition === ReturnDisposition.PENDING
        ? existing.status
        : ReturnStatus.DECIDED);

    return this.prisma.returnRecord.update({
      where: { id },
      data: {
        disposition: dto.disposition,
        status: nextStatus,
        decisionNotes: dto.decisionNotes ?? null,
        decidedByUserId: operatorUserId,
        decidedAt: new Date(),
        processedAt: nextStatus === ReturnStatus.PROCESSED ? new Date() : null,
      },
    });
  }
}
