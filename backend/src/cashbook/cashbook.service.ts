// Updated: 2026-03-17T12:00:00 - 后端第三部分：现金账（最小可用）
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CashbookSessionStatus, CashbookTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CloseSessionDto } from './dto/close-session.dto';

@Injectable()
export class CashbookService {
  constructor(private prisma: PrismaService) {}

  async openSession(
    tenantId: string,
    operatorId: string,
    dto?: OpenSessionDto,
  ) {
    const active = await this.prisma.cashbookSession.findFirst({
      where: { tenantId, operatorId, status: CashbookSessionStatus.OPEN },
    });
    if (active) {
      throw new BadRequestException('已有未关闭的现金柜，请先关柜');
    }
    return this.prisma.cashbookSession.create({
      data: {
        tenantId,
        operatorId,
        openedAt: new Date(),
        openingCash:
          dto?.openingCash != null
            ? new Prisma.Decimal(dto.openingCash)
            : undefined,
        status: CashbookSessionStatus.OPEN,
      },
    });
  }

  async createTransaction(
    tenantId: string,
    operatorId: string,
    dto: CreateTransactionDto,
  ) {
    const session = await this.prisma.cashbookSession.findFirst({
      where: { tenantId, operatorId, status: CashbookSessionStatus.OPEN },
    });
    if (!session) {
      throw new BadRequestException('无有效现金柜，请先开柜');
    }
    const amount =
      dto.type === CashbookTransactionType.IN ? dto.amount : -dto.amount;
    return this.prisma.cashbookTransaction.create({
      data: {
        tenantId,
        sessionId: session.id,
        type: dto.type,
        amount: new Prisma.Decimal(Math.abs(dto.amount)),
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
      },
    });
  }

  async closeSession(
    tenantId: string,
    operatorId: string,
    sessionId: string,
    dto?: CloseSessionDto,
  ) {
    const session = await this.prisma.cashbookSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
        operatorId,
        status: CashbookSessionStatus.OPEN,
      },
    });
    if (!session) {
      throw new NotFoundException('现金柜不存在或已关闭');
    }
    return this.prisma.cashbookSession.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        closingCash:
          dto?.closingCash != null
            ? new Prisma.Decimal(dto.closingCash)
            : undefined,
        status: CashbookSessionStatus.CLOSED,
      },
    });
  }

  /** 日流水：按日期汇总当日发生的 transactions */
  async getLedgerDaily(tenantId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.cashbookTransaction.findMany({
      where: {
        tenantId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      include: { session: true },
      orderBy: { createdAt: 'asc' },
    });

    let totalIn = 0;
    let totalOut = 0;
    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === CashbookTransactionType.IN) {
        totalIn += amt;
      } else {
        totalOut += amt;
      }
    }

    return {
      date,
      transactions: transactions.map((t) => ({
        id: t.id,
        sessionId: t.sessionId,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        createdAt: t.createdAt,
      })),
      summary: { totalIn, totalOut, net: totalIn - totalOut },
    };
  }
}
