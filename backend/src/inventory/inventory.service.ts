// Updated: 2026-02-28T10:00:00
import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { InboundDto } from './dto/inbound.dto';
import { OutboundDto } from './dto/outbound.dto';
import { AdjustDto } from './dto/adjust.dto';
import { TransferDto } from './dto/transfer.dto';
import { LockInventoryDto } from './dto/lock-inventory.dto';
import { UnlockInventoryDto } from './dto/unlock-inventory.dto';

const INVENTORY_INCLUDE = {
  sku: { include: { product: true } },
  warehouse: true,
  binLocation: true,
} as const;

const LEDGER_INCLUDE = {
  sku: { include: { product: true } },
  warehouse: true,
} as const;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventory(
    tenantId: string,
    query: { skuId?: string; warehouseId?: string; page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = { tenantId };
    if (query.skuId) where.skuId = query.skuId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const [data, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        include: INVENTORY_INCLUDE,
        orderBy: [{ warehouseId: 'asc' }, { skuId: 'asc' }],
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getSkuInventorySummary(tenantId: string, skuId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, skuId },
      include: INVENTORY_INCLUDE,
    });

    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalLocked = items.reduce((sum, i) => sum + i.lockedQty, 0);
    const available = totalQuantity - totalLocked;

    return {
      skuId,
      items,
      totalQuantity,
      totalLocked,
      available,
    };
  }

  // Updated: 2026-02-28T10:30:00 - fixed: return summary after transaction commits
  async inbound(tenantId: string, userId: string, dto: InboundDto) {
    const binLocationId = dto.binLocationId ?? null;
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          binLocationId,
        },
      });

      const newQuantity = (existing?.quantity ?? 0) + dto.quantity;

      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: newQuantity },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            tenantId,
            skuId: dto.skuId,
            warehouseId: dto.warehouseId,
            binLocationId,
            quantity: newQuantity,
          },
        });
      }

      await tx.inventoryLedger.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          type: LedgerType.INBOUND,
          quantity: dto.quantity,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          notes: dto.notes,
          operatorId: userId,
        },
      });
    });

    return this.getSkuInventorySummary(tenantId, dto.skuId);
  }

  // Updated: 2026-02-28T10:30:00
  async outbound(tenantId: string, userId: string, dto: OutboundDto) {
    const binLocationId = dto.binLocationId ?? null;
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          binLocationId,
        },
      });

      if (!existing) {
        throw new BadRequestException('Insufficient stock: no inventory found');
      }

      const available = existing.quantity - existing.lockedQty;
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock: available ${available}, requested ${dto.quantity}`,
        );
      }

      await tx.inventoryItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity - dto.quantity },
      });

      await tx.inventoryLedger.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          type: LedgerType.OUTBOUND,
          quantity: -dto.quantity,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          notes: dto.notes,
          operatorId: userId,
        },
      });
    });

    return this.getSkuInventorySummary(tenantId, dto.skuId);
  }

  // Updated: 2026-02-28T10:30:00
  async adjust(tenantId: string, userId: string, dto: AdjustDto) {
    const binLocationId = dto.binLocationId ?? null;
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          binLocationId,
        },
      });

      const newQuantity = Math.max(0, (existing?.quantity ?? 0) + dto.quantity);

      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: newQuantity },
        });
      } else {
        if (newQuantity <= 0) return;
        await tx.inventoryItem.create({
          data: {
            tenantId,
            skuId: dto.skuId,
            warehouseId: dto.warehouseId,
            binLocationId,
            quantity: newQuantity,
          },
        });
      }

      await tx.inventoryLedger.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          type: LedgerType.ADJUSTMENT,
          quantity: dto.quantity,
          notes: dto.notes,
          operatorId: userId,
        },
      });
    });

    return this.getSkuInventorySummary(tenantId, dto.skuId);
  }

  // Updated: 2026-02-28T10:30:00
  async transfer(tenantId: string, userId: string, dto: TransferDto) {
    const fromBinId = dto.fromBinLocationId ?? null;
    const toBinId = dto.toBinLocationId ?? null;

    await this.prisma.$transaction(async (tx) => {
      const fromItem = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.fromWarehouseId,
          binLocationId: fromBinId,
        },
      });

      if (!fromItem) {
        throw new BadRequestException('Insufficient stock at source warehouse');
      }

      const available = fromItem.quantity - fromItem.lockedQty;
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock at source: available ${available}, requested ${dto.quantity}`,
        );
      }

      await tx.inventoryItem.update({
        where: { id: fromItem.id },
        data: { quantity: fromItem.quantity - dto.quantity },
      });

      await tx.inventoryLedger.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.fromWarehouseId,
          type: LedgerType.OUTBOUND,
          quantity: -dto.quantity,
          referenceType: 'TRANSFER',
          referenceId: dto.toWarehouseId,
          notes: dto.notes,
          operatorId: userId,
        },
      });

      const toItem = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.toWarehouseId,
          binLocationId: toBinId,
        },
      });

      if (toItem) {
        await tx.inventoryItem.update({
          where: { id: toItem.id },
          data: { quantity: toItem.quantity + dto.quantity },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            tenantId,
            skuId: dto.skuId,
            warehouseId: dto.toWarehouseId,
            binLocationId: toBinId,
            quantity: dto.quantity,
          },
        });
      }

      await tx.inventoryLedger.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.toWarehouseId,
          type: LedgerType.INBOUND,
          quantity: dto.quantity,
          referenceType: 'TRANSFER',
          referenceId: dto.fromWarehouseId,
          notes: dto.notes,
          operatorId: userId,
        },
      });
    });

    return this.getSkuInventorySummary(tenantId, dto.skuId);
  }

  // Updated: 2026-02-28T10:30:00
  async lockInventory(tenantId: string, userId: string, dto: LockInventoryDto) {
    await this.prisma.$transaction(async (tx) => {
      const items = await tx.inventoryItem.findMany({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
        },
        orderBy: { quantity: 'desc' },
      });

      const totalAvailable = items.reduce(
        (sum, i) => sum + (i.quantity - i.lockedQty),
        0,
      );
      if (totalAvailable < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available to lock: available ${totalAvailable}, requested ${dto.quantity}`,
        );
      }

      let toLock = dto.quantity;
      for (const item of items) {
        if (toLock <= 0) break;
        const avail = item.quantity - item.lockedQty;
        if (avail <= 0) continue;
        const lockFromThis = Math.min(toLock, avail);
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { lockedQty: item.lockedQty + lockFromThis },
        });
        toLock -= lockFromThis;
      }

      await tx.inventoryLedger.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          type: LedgerType.LOCK,
          quantity: dto.quantity,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          operatorId: userId,
        },
      });
    });

    return this.getSkuInventorySummary(tenantId, dto.skuId);
  }

  // Updated: 2026-02-28T10:30:00
  async unlockInventory(tenantId: string, userId: string, dto: UnlockInventoryDto) {
    await this.prisma.$transaction(async (tx) => {
      const items = await tx.inventoryItem.findMany({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
        },
        orderBy: { lockedQty: 'desc' },
      });

      const totalLocked = items.reduce((sum, i) => sum + i.lockedQty, 0);
      if (totalLocked < dto.quantity) {
        throw new BadRequestException(
          `Insufficient locked to unlock: locked ${totalLocked}, requested ${dto.quantity}`,
        );
      }

      let toUnlock = dto.quantity;
      for (const item of items) {
        if (toUnlock <= 0) break;
        if (item.lockedQty <= 0) continue;
        const unlockFromThis = Math.min(toUnlock, item.lockedQty);
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { lockedQty: item.lockedQty - unlockFromThis },
        });
        toUnlock -= unlockFromThis;
      }

      await tx.inventoryLedger.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          type: LedgerType.UNLOCK,
          quantity: -dto.quantity,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          operatorId: userId,
        },
      });
    });

    return this.getSkuInventorySummary(tenantId, dto.skuId);
  }

  async getLedger(
    tenantId: string,
    query: {
      skuId?: string;
      warehouseId?: string;
      type?: LedgerType;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryLedgerWhereInput = { tenantId };
    if (query.skuId) where.skuId = query.skuId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryLedger.findMany({
        where,
        skip,
        take: limit,
        include: LEDGER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryLedger.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
