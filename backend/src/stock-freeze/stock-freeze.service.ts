// 库存冻结单服务：创建冻结、解冻、分页列表；与 InventoryItem.lockedQty 联动
// Updated: 2026-03-14
import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerType, StockFreezeStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreateStockFreezeDto } from './dto/create-stock-freeze.dto';
import { StockFreezeQueryDto } from './dto/stock-freeze-query.dto';

const LIST_INCLUDE = {
  sku: { include: { product: true } },
  warehouse: true,
  binLocation: true,
} as const;

@Injectable()
export class StockFreezeService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, dto: CreateStockFreezeDto) {
    const binLocationId = dto.binLocationId ?? null;
    let created: { id: string } | null = null;

    await this.prisma.$transaction(async (tx) => {
      const items = await tx.inventoryItem.findMany({
        where: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          ...(binLocationId != null ? { binLocationId } : {}),
        },
        orderBy: { quantity: 'desc' },
      });

      const totalAvailable = items.reduce(
        (sum, i) => sum + (i.quantity - i.lockedQty),
        0,
      );
      if (totalAvailable < dto.quantity) {
        throw new BadRequestException(
          `可用库存不足：可用 ${totalAvailable}，请求冻结 ${dto.quantity}`,
        );
      }

      const freeze = await tx.stockFreeze.create({
        data: {
          tenantId,
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          binLocationId,
          quantity: dto.quantity,
          reason: dto.reason ?? null,
          status: StockFreezeStatus.ACTIVE,
        },
      });
      created = { id: freeze.id };

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
          referenceType: 'STOCK_FREEZE',
          referenceId: freeze.id,
          notes: dto.reason ?? null,
          operatorId: userId,
        },
      });
    });

    return this.findOne(tenantId, created!.id);
  }

  async release(tenantId: string, userId: string, id: string) {
    const freeze = await this.prisma.stockFreeze.findFirst({
      where: { id, tenantId },
      include: LIST_INCLUDE,
    });
    if (!freeze) {
      throw new BadRequestException('冻结单不存在');
    }
    if (freeze.status === StockFreezeStatus.RELEASED) {
      throw new BadRequestException('该冻结单已解冻');
    }

    await this.prisma.$transaction(async (tx) => {
      const items = await tx.inventoryItem.findMany({
        where: {
          tenantId,
          skuId: freeze.skuId,
          warehouseId: freeze.warehouseId,
        },
        orderBy: { lockedQty: 'desc' },
      });

      const totalLocked = items.reduce((sum, i) => sum + i.lockedQty, 0);
      if (totalLocked < freeze.quantity) {
        throw new BadRequestException(
          `锁定数量不足：当前锁定 ${totalLocked}，需解冻 ${freeze.quantity}`,
        );
      }

      await tx.stockFreeze.update({
        where: { id },
        data: { status: StockFreezeStatus.RELEASED },
      });

      let toUnlock = freeze.quantity;
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
          skuId: freeze.skuId,
          warehouseId: freeze.warehouseId,
          type: LedgerType.UNLOCK,
          quantity: -freeze.quantity,
          referenceType: 'STOCK_FREEZE',
          referenceId: id,
          notes: `解冻单 ${id}`,
          operatorId: userId,
        },
      });
    });

    return this.findOne(tenantId, id);
  }

  async findOne(tenantId: string, id: string) {
    const row = await this.prisma.stockFreeze.findFirst({
      where: { id, tenantId },
      include: LIST_INCLUDE,
    });
    if (!row) throw new BadRequestException('冻结单不存在');
    return row;
  }

  async findAll(tenantId: string, query: StockFreezeQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockFreezeWhereInput = { tenantId };
    if (query.status) where.status = query.status;
    if (query.skuId) where.skuId = query.skuId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    const [data, total] = await Promise.all([
      this.prisma.stockFreeze.findMany({
        where,
        skip,
        take: limit,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockFreeze.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }
}
