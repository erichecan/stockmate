// Phase 3: Sales Orders Service
// Updated: 2026-03-17T14:30:00 - 批发 DRAFT：create 支持可选 status
// Updated: 2026-03-17T14:33:00 - getUnitPrice 优先读 DB tier 折扣，fallback 硬编码
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerTier,
  InvoiceStatus,
  OrderSource,
  Prisma,
  SOStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

const TIER_DISCOUNT_FALLBACK: Record<CustomerTier, number> = {
  NORMAL: 1.0,
  SILVER: 0.98,
  GOLD: 0.95,
  VIP: 0.9,
};

const SO_INCLUDE = {
  customer: true,
  warehouse: true,
  items: { include: { sku: { include: { product: true } } } },
} as const;

/** 订单处理岗「待处理」队列（可打单/生成波次） */
const ORDER_PIPELINE_STATUSES: SOStatus[] = [
  SOStatus.PENDING,
  SOStatus.CONFIRMED,
  SOStatus.PICKING,
  SOStatus.PACKED,
];

/** 视为已进入处理/履约链路（用于「今日已处理」粗算） */
const ORDER_PROCESSED_STATUSES: SOStatus[] = [
  SOStatus.CONFIRMED,
  SOStatus.PICKING,
  SOStatus.PACKED,
  SOStatus.SHIPPED,
  SOStatus.PARTIALLY_FULFILLED,
  SOStatus.COMPLETED,
];

@Injectable()
export class SalesOrdersService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private notificationsService: NotificationsService,
    private pricing: PricingService,
  ) {}

  /** Unit price = Sku.wholesalePrice * tierDiscount；优先 DB policy，无则 fallback 硬编码 */
  async getUnitPrice(
    tenantId: string,
    wholesalePrice: Prisma.Decimal | null,
    tier: CustomerTier,
  ): Promise<number> {
    const base = wholesalePrice ? Number(wholesalePrice) : 0;
    const multiplier =
      (await this.pricing.getTierDiscountMultiplier(tenantId, tier)) ??
      TIER_DISCOUNT_FALLBACK[tier] ??
      1;
    return base * multiplier;
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SO-${dateStr}-`;
    const count = await this.prisma.salesOrder.count({
      where: {
        tenantId,
        orderNumber: { startsWith: prefix },
      },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // Updated: 2026-03-19T00:31:30 - 事务失败时的降级创建逻辑（非事务）
  private async createWithoutTransaction(
    tenantId: string,
    customerId: string,
    customerTier: CustomerTier,
    dto: CreateSalesOrderDto,
    source: OrderSource,
    status: SOStatus,
  ) {
    const orderNumber = await this.generateOrderNumber(tenantId);
    const pricedItems: Array<{
      skuId: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of dto.items) {
      const sku = await this.prisma.sku.findFirst({
        where: { id: item.skuId, tenantId },
        include: { product: true },
      });
      if (!sku) throw new NotFoundException(`SKU ${item.skuId} not found`);
      const unitPrice = await this.getUnitPrice(
        tenantId,
        sku.wholesalePrice,
        customerTier,
      );
      pricedItems.push({
        skuId: item.skuId,
        quantity: item.quantity,
        unitPrice,
      });
    }

    const totalAmount = pricedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const so = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        tenantId,
        customerId,
        warehouseId: dto.warehouseId,
        currency: dto.currency ?? 'EUR',
        notes: dto.notes,
        status,
        source,
      },
    });

    for (const item of pricedItems) {
      await this.prisma.salesOrderItem.create({
        data: {
          salesOrderId: so.id,
          skuId: item.skuId,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
        },
      });
    }

    await this.prisma.salesOrder.update({
      where: { id: so.id },
      data: { totalAmount: new Prisma.Decimal(totalAmount) },
    });

    // Updated: 2026-03-19T00:49:10 - 避免写操作 + include 触发内部事务，拆成独立读查询
    return this.prisma.salesOrder.findFirstOrThrow({
      where: { id: so.id, tenantId },
      include: SO_INCLUDE,
    });
  }

  async create(
    tenantId: string,
    dto: CreateSalesOrderDto,
    source: OrderSource = OrderSource.MANUAL,
    status: SOStatus = SOStatus.PENDING,
  ) {
    const [customer, warehouse] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, tenantId },
      }),
    ]);
    if (!customer) throw new NotFoundException('Customer not found');
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    if (!customer.isActive)
      throw new BadRequestException('Customer is inactive');

    // Updated: 2026-03-19T00:42:20 - Cloud Run + Neon 下禁用事务路径，彻底规避 WebSocket 建连失败
    return this.createWithoutTransaction(
      tenantId,
      dto.customerId,
      customer.tier,
      dto,
      source,
      status,
    );
  }

  /** 订单处理看板 KPI（自然日按 UTC 边界，与列表分页配合） */
  // Updated: 2026-03-20T07:27:38-0400
  async getProcessingDashboardStats(tenantId: string) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const todayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const yesterday = new Date(Date.UTC(y, m, d - 1, 0, 0, 0, 0));
    const yesterdayEnd = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));

    const unpaidInvoiceStatuses: InvoiceStatus[] = [
      InvoiceStatus.UNPAID,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
    ];

    const [
      processedTodayCount,
      todayTotalOrdersCount,
      yesterdayTotalOrdersCount,
      pendingPipelineCount,
      unpaidFailedCount,
    ] = await Promise.all([
      this.prisma.salesOrder.count({
        where: {
          tenantId,
          updatedAt: { gte: todayStart, lte: now },
          status: { in: ORDER_PROCESSED_STATUSES },
        },
      }),
      this.prisma.salesOrder.count({
        where: {
          tenantId,
          createdAt: { gte: todayStart, lte: now },
          status: { not: SOStatus.CANCELLED },
        },
      }),
      this.prisma.salesOrder.count({
        where: {
          tenantId,
          createdAt: { gte: yesterday, lt: yesterdayEnd },
          status: { not: SOStatus.CANCELLED },
        },
      }),
      this.prisma.salesOrder.count({
        where: { tenantId, status: { in: ORDER_PIPELINE_STATUSES } },
      }),
      this.prisma.salesOrder.count({
        where: {
          tenantId,
          OR: [
            { status: SOStatus.DRAFT },
            {
              invoices: {
                some: { status: { in: unpaidInvoiceStatuses } },
              },
            },
          ],
        },
      }),
    ]);

    return {
      processedTodayCount,
      todayTotalOrdersCount,
      yesterdayTotalOrdersCount,
      pendingPipelineCount,
      unpaidFailedCount,
    };
  }

  async findAll(
    tenantId: string,
    query: {
      status?: SOStatus;
      statusIn?: SOStatus[];
      customerId?: string;
      page?: number;
      limit?: number;
      unpaidIssue?: boolean;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SalesOrderWhereInput = { tenantId };
    if (query.customerId) where.customerId = query.customerId;

    if (query.unpaidIssue) {
      where.OR = [
        { status: SOStatus.DRAFT },
        {
          invoices: {
            some: {
              status: {
                in: [
                  InvoiceStatus.UNPAID,
                  InvoiceStatus.PARTIALLY_PAID,
                  InvoiceStatus.OVERDUE,
                ],
              },
            },
          },
        },
      ];
    } else if (query.statusIn?.length) {
      where.status = { in: query.statusIn };
    } else if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: SO_INCLUDE,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, tenantId: string) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
      include: SO_INCLUDE,
    });
    if (!so) throw new NotFoundException('Sales order not found');
    return so;
  }

  async update(id: string, tenantId: string, dto: UpdateSalesOrderDto) {
    await this.findOne(id, tenantId);
    return this.prisma.salesOrder.update({
      where: { id },
      data: dto,
      include: SO_INCLUDE,
    });
  }

  async confirm(id: string, tenantId: string, userId: string) {
    const so = await this.findOne(id, tenantId);
    if (so.status !== SOStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm: order status is ${so.status}`,
      );
    }

    for (const item of so.items) {
      await this.inventory.lockInventory(tenantId, userId, {
        skuId: item.skuId,
        warehouseId: so.warehouseId,
        quantity: item.quantity,
        referenceType: 'SO',
        referenceId: so.id,
      });
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: SOStatus.CONFIRMED },
      include: SO_INCLUDE,
    });
  }

  async cancel(id: string, tenantId: string, userId: string) {
    const so = await this.findOne(id, tenantId);
    if (so.status !== SOStatus.PENDING && so.status !== SOStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel: order status is ${so.status}`,
      );
    }

    if (so.status === SOStatus.CONFIRMED) {
      for (const item of so.items) {
        await this.inventory.unlockInventory(tenantId, userId, {
          skuId: item.skuId,
          warehouseId: so.warehouseId,
          quantity: item.quantity,
          referenceType: 'SO',
          referenceId: so.id,
        });
      }
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: SOStatus.CANCELLED },
      include: SO_INCLUDE,
    });
  }

  async getPickList(id: string, tenantId: string) {
    const so = await this.findOne(id, tenantId);
    if (so.status === SOStatus.CANCELLED || so.status === SOStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot get pick list for ${so.status} order`,
      );
    }

    const pickItems: {
      binCode: string;
      skuCode: string;
      skuName: string;
      quantity: number;
    }[] = [];

    for (const item of so.items) {
      const invItems = await this.prisma.inventoryItem.findMany({
        where: {
          tenantId,
          skuId: item.skuId,
          warehouseId: so.warehouseId,
          quantity: { gt: 0 },
        },
        include: { binLocation: true, sku: { include: { product: true } } },
        orderBy: { binLocation: { code: 'asc' } },
      });

      let remaining = item.quantity;
      for (const inv of invItems) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, inv.quantity);
        remaining -= take;
        pickItems.push({
          binCode: inv.binLocation?.code ?? '未指定',
          skuCode: inv.sku.code,
          skuName: inv.sku.product?.name ?? inv.sku.code,
          quantity: take,
        });
      }
      if (remaining > 0) {
        const skuInfo = await this.prisma.sku.findFirst({
          where: { id: item.skuId },
          include: { product: true },
        });
        pickItems.push({
          binCode: '缺货',
          skuCode: skuInfo?.code ?? item.skuId,
          skuName: skuInfo?.product?.name ?? skuInfo?.code ?? item.skuId,
          quantity: remaining,
        });
      }
    }

    return {
      salesOrderId: so.id,
      orderNumber: so.orderNumber,
      warehouseName: so.warehouse.name,
      items: pickItems.sort((a, b) => a.binCode.localeCompare(b.binCode)),
    };
  }

  async fulfill(id: string, tenantId: string, userId: string) {
    const so = await this.findOne(id, tenantId);
    const allowedStatuses: SOStatus[] = [
      SOStatus.CONFIRMED,
      SOStatus.PICKING,
      SOStatus.PACKED,
    ];
    if (!allowedStatuses.includes(so.status)) {
      throw new BadRequestException(
        `Cannot fulfill: order status is ${so.status}`,
      );
    }

    for (const item of so.items) {
      await this.inventory.outbound(tenantId, userId, {
        skuId: item.skuId,
        warehouseId: so.warehouseId,
        quantity: item.quantity,
        referenceType: 'SO',
        referenceId: so.id,
        notes: `Sales order ${so.orderNumber}`,
      });
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: {
        status: SOStatus.COMPLETED,
        shippedAt: new Date(),
      },
      include: SO_INCLUDE,
    });

    // 2026-03-17T12:00:00 - 出库通知：运营角色 + 对应客户
    const payload = {
      orderId: so.id,
      orderNumber: so.orderNumber,
      customerId: so.customerId,
    };
    const opsUsers = await this.prisma.user.findMany({
      where: { tenantId, role: UserRole.OPERATIONS, isActive: true },
      select: { id: true },
    });
    for (const u of opsUsers) {
      await this.notificationsService.createEvent({
        tenantId,
        type: 'OUTBOUND_COMPLETED',
        title: `订单 ${so.orderNumber} 已出库`,
        body: `销售订单 ${so.orderNumber} 已完成出库`,
        payload,
        targetUserId: u.id,
      });
    }
    await this.notificationsService.createEvent({
      tenantId,
      type: 'OUTBOUND_COMPLETED',
      title: `您的订单 ${so.orderNumber} 已出库`,
      body: `订单 ${so.orderNumber} 已完成出库`,
      payload,
      targetCustomerId: so.customerId,
    });

    return updated;
  }
}
