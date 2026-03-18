// Updated: 2026-03-17T14:30:00 - 批发 DRAFT 订单 + 再来一单 + 预售限购
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerTier, OrderSource, Prisma, SOStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { CreateSalesOrderDto } from '../sales-orders/dto/create-sales-order.dto';

const SO_INCLUDE = {
  customer: true,
  warehouse: true,
  items: { include: { sku: { include: { product: true } } } },
} as const;

@Injectable()
export class WholesaleOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesOrdersService: SalesOrdersService,
  ) {}

  /**
   * 获取当前客户最近 N 单（排除 DRAFT），用于「再来一单」候选
   */
  async getReorderCandidates(tenantId: string, customerId: string, limit = 5) {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        tenantId,
        customerId,
        status: { not: SOStatus.DRAFT },
        source: OrderSource.WHOLESALE_SITE,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: SO_INCLUDE,
    });
    return orders;
  }

  /**
   * 合并多单行项目生成 DRAFT 订单（同 SKU 合并数量）
   */
  async mergeDraft(tenantId: string, customerId: string, orderIds: string[]) {
    if (!orderIds?.length) {
      throw new BadRequestException('orderIds is required');
    }

    const orders = await this.prisma.salesOrder.findMany({
      where: { id: { in: orderIds }, tenantId, customerId },
      include: { items: true, warehouse: true },
    });

    if (orders.length !== orderIds.length) {
      throw new BadRequestException('Some orders not found or not yours');
    }

    const skuMap = new Map<string, number>();
    const warehouseId = orders[0].warehouseId;

    for (const order of orders) {
      for (const item of order.items) {
        const qty = skuMap.get(item.skuId) ?? 0;
        skuMap.set(item.skuId, qty + item.quantity);
      }
    }

    const items = Array.from(skuMap.entries())
      .filter(([, qty]) => qty > 0)
      .map(([skuId, quantity]) => ({ skuId, quantity }));

    if (!items.length) {
      throw new BadRequestException('No items to merge');
    }

    await this.validatePreorderLimits(tenantId, customerId, items);

    const createDto: CreateSalesOrderDto = {
      customerId,
      warehouseId,
      currency: 'EUR',
      items,
    };

    return this.salesOrdersService.create(
      tenantId,
      createDto,
      OrderSource.REORDER_MERGED,
      SOStatus.DRAFT,
    );
  }

  /**
   * DRAFT -> PENDING（进入正式流程），下单前校验预售限购
   */
  async payDraft(id: string, tenantId: string, customerId: string) {
    const order = await this.salesOrdersService.findOne(id, tenantId);
    if (order.customerId !== customerId) {
      throw new NotFoundException('Sales order not found');
    }
    if (order.status !== SOStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT orders can be paid, current: ${order.status}`,
      );
    }

    const items = order.items.map((i) => ({
      skuId: i.skuId,
      quantity: i.quantity,
    }));
    await this.validatePreorderLimits(tenantId, customerId, items);

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: SOStatus.PENDING },
      include: SO_INCLUDE,
    });
  }

  /**
   * PATCH DRAFT 订单行（全量覆盖 items）
   */
  async patchDraftItems(
    id: string,
    tenantId: string,
    customerId: string,
    items: { skuId: string; quantity: number }[],
  ) {
    const order = await this.salesOrdersService.findOne(id, tenantId);
    if (order.customerId !== customerId) {
      throw new NotFoundException('Sales order not found');
    }
    if (order.status !== SOStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT orders can be edited, current: ${order.status}`,
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const validItems = items.filter((i) => i.quantity > 0);
    if (!validItems.length) {
      throw new BadRequestException(
        'At least one item with quantity > 0 required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

      let totalAmount = 0;
      const TIER_DISCOUNT: Record<CustomerTier, number> = {
        NORMAL: 1.0,
        SILVER: 0.98,
        GOLD: 0.95,
        VIP: 0.9,
      };

      for (const item of validItems) {
        const sku = await tx.sku.findFirst({
          where: { id: item.skuId, tenantId },
          include: { product: true },
        });
        if (!sku) throw new NotFoundException(`SKU ${item.skuId} not found`);
        const base = sku.wholesalePrice ? Number(sku.wholesalePrice) : 0;
        const unitPrice = base * (TIER_DISCOUNT[customer.tier] ?? 1);
        totalAmount += unitPrice * item.quantity;
        await tx.salesOrderItem.create({
          data: {
            salesOrderId: id,
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(unitPrice),
          },
        });
      }

      return tx.salesOrder.update({
        where: { id },
        data: { totalAmount: new Prisma.Decimal(totalAmount) },
        include: SO_INCLUDE,
      });
    });
  }

  /**
   * 获取 SKU 的预售限购数量（等级配置优先于统一配置）
   */
  async getPreorderLimit(
    tenantId: string,
    skuId: string,
    customerTier: CustomerTier,
  ): Promise<number | null> {
    const [tierLimit, globalLimit] = await Promise.all([
      this.prisma.preorderTierLimit.findUnique({
        where: { tenantId_skuId_tier: { tenantId, skuId, tier: customerTier } },
      }),
      this.prisma.preorderLimit.findUnique({
        where: { tenantId_skuId: { tenantId, skuId } },
      }),
    ]);
    if (tierLimit) return tierLimit.maxQtyPerOrder;
    if (globalLimit) return globalLimit.maxQtyPerOrder;
    return null;
  }

  /**
   * 校验订单行是否超过预售限购
   */
  async validatePreorderLimits(
    tenantId: string,
    customerId: string,
    items: { skuId: string; quantity: number }[],
  ): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    for (const item of items) {
      const limit = await this.getPreorderLimit(
        tenantId,
        item.skuId,
        customer.tier,
      );
      if (limit != null && item.quantity > limit) {
        throw new BadRequestException(
          `SKU ${item.skuId} preorder limit exceeded: max ${limit} per order`,
        );
      }
    }
  }
}
