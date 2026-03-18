// Updated: 2026-03-17T12:00:00 - 后端第三部分：出库通知（最小实现）
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateEventInput {
  tenantId: string;
  type: string;
  title?: string;
  body?: string;
  payload?: Record<string, unknown>;
  targetUserId?: string;
  targetCustomerId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createEvent(input: CreateEventInput) {
    return this.prisma.notificationEvent.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: (input.payload ?? undefined) as object | undefined,
        targetUserId: input.targetUserId,
        targetCustomerId: input.targetCustomerId,
      },
    });
  }

  /** 查询「我的」通知：targetUserId=userId 或 targetCustomerId=customerId */
  async queryMyEvents(
    tenantId: string,
    options: {
      userId?: string;
      customerId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { userId, customerId, limit = 50, offset = 0 } = options;
    const where: {
      tenantId: string;
      OR: Array<{ targetUserId?: string; targetCustomerId?: string }>;
    } = {
      tenantId,
      OR: [],
    };
    if (userId) where.OR.push({ targetUserId: userId });
    if (customerId) where.OR.push({ targetCustomerId: customerId });
    if (where.OR.length === 0) return { data: [], total: 0 };

    const [data, total] = await Promise.all([
      this.prisma.notificationEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notificationEvent.count({ where }),
    ]);
    return { data, total };
  }
}
