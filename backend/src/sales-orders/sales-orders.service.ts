// Phase 3: Sales Orders Service
// Updated: 2026-02-28T14:20:00
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerTier, Prisma, SOStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

const TIER_DISCOUNT: Record<CustomerTier, number> = {
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

@Injectable()
export class SalesOrdersService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  /** Unit price = Sku.wholesalePrice * tierDiscount */
  getUnitPrice(wholesalePrice: Prisma.Decimal | null, tier: CustomerTier): number {
    const base = wholesalePrice ? Number(wholesalePrice) : 0;
    return base * (TIER_DISCOUNT[tier] ?? 1);
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

  async create(tenantId: string, dto: CreateSalesOrderDto) {
    const [customer, warehouse] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId } }),
    ]);
    if (!customer) throw new NotFoundException('Customer not found');
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    if (!customer.isActive) throw new BadRequestException('Customer is inactive');

    const orderNumber = await this.generateOrderNumber(tenantId);
    let totalAmount = 0;

    return this.prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.create({
        data: {
          orderNumber,
          tenantId,
          customerId: dto.customerId,
          warehouseId: dto.warehouseId,
          currency: dto.currency ?? 'EUR',
          notes: dto.notes,
          status: SOStatus.PENDING,
        },
      });

      for (const item of dto.items) {
        const sku = await tx.sku.findFirst({
          where: { id: item.skuId, tenantId },
          include: { product: true },
        });
        if (!sku) throw new NotFoundException(`SKU ${item.skuId} not found`);
        const unitPrice = this.getUnitPrice(sku.wholesalePrice, customer.tier);
        const lineTotal = unitPrice * item.quantity;
        totalAmount += lineTotal;
        await tx.salesOrderItem.create({
          data: {
            salesOrderId: so.id,
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(unitPrice),
          },
        });
      }

      return tx.salesOrder.update({
        where: { id: so.id },
        data: { totalAmount: new Prisma.Decimal(totalAmount) },
        include: SO_INCLUDE,
      });
    });
  }

  async findAll(
    tenantId: string,
    query: { status?: SOStatus; customerId?: string; page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SalesOrderWhereInput = { tenantId };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;

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
      await this.inventory.lockInventory(
        tenantId,
        userId,
        {
          skuId: item.skuId,
          warehouseId: so.warehouseId,
          quantity: item.quantity,
          referenceType: 'SO',
          referenceId: so.id,
        },
      );
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
        await this.inventory.unlockInventory(
          tenantId,
          userId,
          {
            skuId: item.skuId,
            warehouseId: so.warehouseId,
            quantity: item.quantity,
            referenceType: 'SO',
            referenceId: so.id,
          },
        );
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

    const pickItems: { binCode: string; skuCode: string; skuName: string; quantity: number }[] = [];

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
    const allowedStatuses: SOStatus[] = [SOStatus.CONFIRMED, SOStatus.PICKING, SOStatus.PACKED];
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

    return this.prisma.salesOrder.update({
      where: { id },
      data: {
        status: SOStatus.COMPLETED,
        shippedAt: new Date(),
      },
      include: SO_INCLUDE,
    });
  }
}
