// Updated: 2026-03-20T11:38:20 - 收款登记服务（冲减客户欠款与发票欠款）
import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toAmount(value: unknown): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value) || 0;
    if (typeof value === 'object' && 'toString' in (value as object)) {
      return Number((value as { toString: () => string }).toString()) || 0;
    }
    return 0;
  }

  // Updated: 2026-03-20T11:38:20 - 收款入账并自动核销发票
  async createPayment(tenantId: string, receivedBy: string, dto: CreatePaymentDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        outstandingBalance: true,
        creditLimit: true,
        creditFrozen: true,
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
    const payment = await this.prisma.paymentRecord.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        amount: new Prisma.Decimal(dto.amount),
        method: dto.method,
        reference: dto.reference?.trim() || null,
        notes: dto.notes?.trim() || null,
        receivedBy,
        receivedAt,
      },
    });

    const balanceBefore = this.toAmount(customer.outstandingBalance);
    const balanceAfter = Math.max(0, balanceBefore - dto.amount);
    const creditLimitAmount = this.toAmount(customer.creditLimit);
    const shouldUnfreeze =
      customer.creditFrozen &&
      (creditLimitAmount <= 0 || balanceAfter < creditLimitAmount);

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        outstandingBalance: new Prisma.Decimal(balanceAfter),
        ...(shouldUnfreeze ? { creditFrozen: false } : {}),
      },
    });

    // Updated: 2026-03-20T11:38:20 - 按开票时间从早到晚核销未结发票
    const openInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        customerId: dto.customerId,
        status: {
          in: [
            InvoiceStatus.UNPAID,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE,
          ],
        },
      },
      orderBy: { issuedAt: 'asc' },
      select: {
        id: true,
        invoiceNo: true,
        amount: true,
        paidAmount: true,
        status: true,
      },
    });

    let remaining = dto.amount;
    const appliedInvoices: Array<{
      invoiceId: string;
      invoiceNo: string;
      appliedAmount: number;
      statusAfter: InvoiceStatus;
    }> = [];

    for (const invoice of openInvoices) {
      if (remaining <= 0) break;
      const invoiceAmount = this.toAmount(invoice.amount);
      const paidAmount = this.toAmount(invoice.paidAmount);
      const unpaid = Math.max(0, invoiceAmount - paidAmount);
      if (unpaid <= 0) continue;

      const appliedAmount = Math.min(unpaid, remaining);
      const paidAfter = paidAmount + appliedAmount;
      const statusAfter =
        paidAfter >= invoiceAmount
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: new Prisma.Decimal(paidAfter),
          status: statusAfter,
          paidAt: statusAfter === InvoiceStatus.PAID ? receivedAt : null,
        },
      });

      appliedInvoices.push({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        appliedAmount,
        statusAfter,
      });
      remaining -= appliedAmount;
    }

    return {
      payment: {
        id: payment.id,
        customerId: payment.customerId,
        amount: this.toAmount(payment.amount),
        method: payment.method,
        reference: payment.reference,
        notes: payment.notes,
        receivedAt: payment.receivedAt,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        code: customer.code,
        outstandingBefore: balanceBefore,
        outstandingAfter: balanceAfter,
        creditFrozenAfter: shouldUnfreeze ? false : customer.creditFrozen,
      },
      allocation: {
        appliedInvoices,
        unappliedAmount: Math.max(0, remaining),
      },
    };
  }
}
