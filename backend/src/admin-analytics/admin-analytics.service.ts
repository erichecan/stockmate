// Updated: 2026-03-20T11:14:31 - 老板经营总览聚合服务（补充员工执行结果与现金对账）
import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  OrderSource,
  PaymentMethod,
  SOStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

@Injectable()
export class AdminAnalyticsService {
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

  private buildMonthRange(month?: string) {
    const current = month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : undefined;
    const firstDay = current ? new Date(`${current}T00:00:00.000Z`) : new Date();
    if (!current) {
      firstDay.setUTCDate(1);
      firstDay.setUTCHours(0, 0, 0, 0);
    }
    const nextMonth = new Date(firstDay);
    nextMonth.setUTCMonth(firstDay.getUTCMonth() + 1);
    const lastDay = new Date(nextMonth.getTime() - 1);
    return { start: firstDay, end: lastDay };
  }

  private buildTodayRange() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);
    return { todayStart, todayEnd };
  }

  // Updated: 2026-03-20T10:42:55 - 输出老板关注的经营维度（金额、走势、榜单、补充维度）
  async getOverview(tenantId: string, month?: string) {
    const { start, end } = this.buildMonthRange(month);
    const { todayStart, todayEnd } = this.buildTodayRange();

    const monthOrders = await this.prisma.salesOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
        status: { not: SOStatus.CANCELLED },
      },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { id: true, name: true, code: true } },
      },
    });

    const todayRevenue = this.toAmount(
      (
        await this.prisma.salesOrder.aggregate({
          where: {
            tenantId,
            createdAt: { gte: todayStart, lt: todayEnd },
            status: { not: SOStatus.CANCELLED },
          },
          _sum: { totalAmount: true },
        })
      )._sum.totalAmount,
    );

    const monthRevenue = monthOrders.reduce(
      (sum, o) => sum + this.toAmount(o.totalAmount),
      0,
    );
    const monthOrderCount = monthOrders.length;
    const averageOrderAmount = monthOrderCount > 0 ? monthRevenue / monthOrderCount : 0;

    const newCustomers = await this.prisma.customer.count({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end },
      },
    });

    const daysMap = new Map<string, TrendPoint>();
    const dayCursor = new Date(start);
    while (dayCursor <= end) {
      const key = dayCursor.toISOString().slice(0, 10);
      daysMap.set(key, { date: key, revenue: 0, orders: 0 });
      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }
    for (const o of monthOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const row = daysMap.get(key);
      if (!row) continue;
      row.orders += 1;
      row.revenue += this.toAmount(o.totalAmount);
    }
    const trends = Array.from(daysMap.values());

    const monthItems = await this.prisma.salesOrderItem.findMany({
      where: {
        salesOrder: {
          tenantId,
          createdAt: { gte: start, lte: end },
          status: { not: SOStatus.CANCELLED },
        },
      },
      select: {
        skuId: true,
        quantity: true,
        sku: { select: { code: true, product: { select: { name: true } } } },
      },
    });
    const productMap = new Map<string, { skuCode: string; productName: string; qty: number }>();
    for (const item of monthItems) {
      const key = item.skuId;
      const prev = productMap.get(key);
      const skuCode = item.sku?.code || key;
      const productName = item.sku?.product?.name || skuCode;
      if (!prev) {
        productMap.set(key, { skuCode, productName, qty: item.quantity });
      } else {
        prev.qty += item.quantity;
      }
    }
    const topProductsByQty = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 50);

    const retailerMap = new Map<
      string,
      { customerId: string; customerName: string; customerCode: string; orderCount: number; amount: number }
    >();
    for (const order of monthOrders) {
      if (!order.customerId) continue;
      const prev = retailerMap.get(order.customerId);
      const amount = this.toAmount(order.totalAmount);
      const customerName = order.customer?.name || order.customerId;
      const customerCode = order.customer?.code || '-';
      if (!prev) {
        retailerMap.set(order.customerId, {
          customerId: order.customerId,
          customerName,
          customerCode,
          orderCount: 1,
          amount,
        });
      } else {
        prev.orderCount += 1;
        prev.amount += amount;
      }
    }
    const retailers = Array.from(retailerMap.values());
    const topRetailersByAmount = [...retailers]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    const topRetailersByOrderCount = [...retailers]
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    const pendingOrderCount = await this.prisma.salesOrder.count({
      where: {
        tenantId,
        status: { in: [SOStatus.PENDING, SOStatus.CONFIRMED, SOStatus.PICKING, SOStatus.PACKED] },
      },
    });
    const returnCountMonth = await this.prisma.returnRecord.count({
      where: { tenantId, createdAt: { gte: start, lte: end } },
    });
    const creditRiskCustomerCount = await this.prisma.customer.count({
      where: {
        tenantId,
        creditLimit: { not: null },
        outstandingBalance: { gt: 0 },
      },
    });
    const uniqueBuyers = new Set(monthOrders.map((o) => o.customerId).filter(Boolean)).size;
    const repeatBuyers = retailers.filter((x) => x.orderCount >= 2).length;
    const repeatBuyerRate = uniqueBuyers > 0 ? (repeatBuyers / uniqueBuyers) * 100 : 0;

    // Updated: 2026-03-20T11:14:31 - 员工执行结果（上班人数、打卡下班、订单与拣货执行）
    const staffRolesWarehouse: UserRole[] = [UserRole.WAREHOUSE, UserRole.PICKER];
    const staffRolesOps: UserRole[] = [
      UserRole.OPERATIONS,
      UserRole.SALES_SUPERVISOR,
      UserRole.SALES,
    ];
    const todayStaff = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: [...staffRolesWarehouse, ...staffRolesOps] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
      },
    });
    const shiftMap = new Map<string, Date>();
    const todayShiftRows = await this.prisma.shiftHandover.findMany({
      where: {
        tenantId,
        shiftStart: { gte: todayStart, lt: todayEnd },
      },
      select: { operatorId: true, shiftEnd: true },
      orderBy: { shiftEnd: 'desc' },
    });
    for (const row of todayShiftRows) {
      if (!row.shiftEnd) continue;
      if (!shiftMap.has(row.operatorId)) {
        shiftMap.set(row.operatorId, row.shiftEnd);
      }
    }
    const formatName = (u: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    }) => {
      const full = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return full || u.email;
    };
    const warehouseStaff = todayStaff
      .filter((u) => staffRolesWarehouse.includes(u.role))
      .map((u) => ({
        userId: u.id,
        name: formatName(u),
        role: u.role,
        checkInAt: u.lastLoginAt,
        checkOutAt: shiftMap.get(u.id) ?? null,
      }))
      .filter((u) => u.checkInAt && u.checkInAt >= todayStart && u.checkInAt < todayEnd);
    const opsStaff = todayStaff
      .filter((u) => staffRolesOps.includes(u.role))
      .map((u) => ({
        userId: u.id,
        name: formatName(u),
        role: u.role,
        checkInAt: u.lastLoginAt,
        checkOutAt: shiftMap.get(u.id) ?? null,
      }))
      .filter((u) => u.checkInAt && u.checkInAt >= todayStart && u.checkInAt < todayEnd);

    const wholesaleOrdersToday = await this.prisma.salesOrder.count({
      where: {
        tenantId,
        createdAt: { gte: todayStart, lt: todayEnd },
        status: { not: SOStatus.CANCELLED },
        source: {
          in: [
            OrderSource.WHOLESALE_SITE,
            OrderSource.REORDER_MERGED,
            OrderSource.PREORDER,
            OrderSource.SALES_REP,
          ],
        },
      },
    });
    const warehousePickRunsToday = await this.prisma.pickWave.count({
      where: {
        tenantId,
        startedAt: { gte: todayStart, lt: todayEnd },
      },
    });
    const unpickedWaves = await this.prisma.pickWave.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: { id: true, totalOrders: true },
    });
    const unpickedWaveCount = unpickedWaves.length;
    const unpickedOrderCount = unpickedWaves.reduce(
      (sum, wave) => sum + (wave.totalOrders || 0),
      0,
    );

    // Updated: 2026-03-20T11:14:31 - 现金与对账（只看结果）
    const todayOrderCount = await this.prisma.salesOrder.count({
      where: {
        tenantId,
        createdAt: { gte: todayStart, lt: todayEnd },
        status: { not: SOStatus.CANCELLED },
      },
    });
    const paymentsToday = await this.prisma.paymentRecord.findMany({
      where: {
        tenantId,
        receivedAt: { gte: todayStart, lt: todayEnd },
      },
      select: { amount: true, method: true },
    });
    let cashAmount = 0;
    let debitCardAmount = 0;
    let creditCardAmount = 0;
    for (const p of paymentsToday) {
      const amount = this.toAmount(p.amount);
      if (p.method === PaymentMethod.CASH) {
        cashAmount += amount;
      } else if (p.method === PaymentMethod.DEBIT_CARD) {
        // Updated: 2026-03-20T11:41:24 - DEBIT_CARD 独立口径统计
        debitCardAmount += amount;
      } else if (p.method === PaymentMethod.CREDIT_CARD) {
        creditCardAmount += amount;
      } else {
        // Updated: 2026-03-20T11:41:24 - 其余收款方式仍归并到 debit 卡口径
        debitCardAmount += amount;
      }
    }
    const totalReceived = cashAmount + debitCardAmount + creditCardAmount;

    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
      },
      select: {
        customerId: true,
        amount: true,
        paidAmount: true,
        customer: { select: { name: true, code: true } },
      },
    });
    const unpaidByRetailer = new Map<string, { customerId: string; customerName: string; customerCode: string; unpaidAmount: number }>();
    for (const inv of unpaidInvoices) {
      const customerId = inv.customerId;
      const unpaidAmount = Math.max(0, this.toAmount(inv.amount) - this.toAmount(inv.paidAmount));
      if (unpaidAmount <= 0) continue;
      const prev = unpaidByRetailer.get(customerId);
      const customerName = inv.customer?.name || customerId;
      const customerCode = inv.customer?.code || '-';
      if (!prev) {
        unpaidByRetailer.set(customerId, {
          customerId,
          customerName,
          customerCode,
          unpaidAmount,
        });
      } else {
        prev.unpaidAmount += unpaidAmount;
      }
    }
    const unpaidRetailers = Array.from(unpaidByRetailer.values()).sort(
      (a, b) => b.unpaidAmount - a.unpaidAmount,
    );
    const unpaidTotal = unpaidRetailers.reduce((sum, x) => sum + x.unpaidAmount, 0);

    return {
      month: start.toISOString().slice(0, 7),
      todayRevenue,
      monthRevenue,
      monthOrderCount,
      averageOrderAmount,
      newCustomers,
      trends,
      topProductsByQty,
      topRetailersByAmount,
      topRetailersByOrderCount,
      extraMetrics: {
        pendingOrderCount,
        returnCountMonth,
        creditRiskCustomerCount,
        uniqueBuyers,
        repeatBuyers,
        repeatBuyerRate,
      },
      staffExecution: {
        staffOnDutyToday: warehouseStaff.length + opsStaff.length,
        warehouseOnDutyToday: warehouseStaff.length,
        opsOnDutyToday: opsStaff.length,
        warehouseStaff,
        opsStaff,
        wholesaleOrdersProcessedToday: wholesaleOrdersToday,
        warehousePickRunsToday,
        unpickedWaveCount,
        unpickedOrderCount,
      },
      cashReconciliation: {
        todayOrderCount,
        totalReceived,
        cashAmount,
        debitCardAmount,
        creditCardAmount,
        unpaidTotal,
        unpaidRetailers,
      },
    };
  }
}

