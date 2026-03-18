// ActionLogService - 操作日志服务，阶段一底座整合
// Updated: 2026-03-14
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

export interface CreateActionLogInput {
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class ActionLogService {
  constructor(private prisma: PrismaService) {}

  /** 创建一条操作日志（不抛错，避免影响主流程） */
  async create(input: CreateActionLogInput) {
    try {
      return await this.prisma.actionLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          payload: input.payload ?? Prisma.JsonNull,
        },
      });
    } catch {
      // 日志写入失败不阻断业务
    }
  }

  /** 分页查询操作日志列表 */
  async findPage(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      entityType?: string;
      action?: string;
    },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ActionLogWhereInput = { tenantId };
    if (params.entityType) where.entityType = params.entityType;
    if (params.action) where.action = params.action;

    const [data, total] = await Promise.all([
      this.prisma.actionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.actionLog.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
