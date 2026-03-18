// Updated: 2026-03-18T23:31:40 - 正式 WMS 波次实体服务
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PickWaveStatus, Prisma, SOStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWaveDto } from './dto/create-wave.dto';

const WAVE_ELIGIBLE_ORDER_STATUS: SOStatus[] = [
  SOStatus.PENDING,
  SOStatus.CONFIRMED,
  SOStatus.PICKING,
  SOStatus.PACKED,
];

@Injectable()
export class WmsWavesService {
  constructor(private readonly prisma: PrismaService) {}

  // Updated: 2026-03-18T23:26:10 - 生成波次号
  private async generateWaveNumber(tenantId: string) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `WAVE-${dateStr}-`;
    const count = await this.prisma.pickWave.count({
      where: {
        tenantId,
        waveNumber: { startsWith: prefix },
      },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // Updated: 2026-03-18T23:26:35 - 创建正式波次实体
  async createWave(tenantId: string, dto: CreateWaveDto) {
    const orderIds = Array.from(new Set(dto.orderIds.map((id) => id.trim()))).filter(
      Boolean,
    );
    if (!orderIds.length) {
      throw new BadRequestException('orderIds is required');
    }

    const orders = await this.prisma.salesOrder.findMany({
      where: {
        id: { in: orderIds },
        tenantId,
      },
      include: {
        items: true,
      },
    });

    if (orders.length !== orderIds.length) {
      throw new BadRequestException('Some orders not found');
    }

    const hasIneligible = orders.some(
      (o) => !WAVE_ELIGIBLE_ORDER_STATUS.includes(o.status),
    );
    if (hasIneligible) {
      throw new BadRequestException(
        'Only PENDING/CONFIRMED/PICKING/PACKED orders can join a wave',
      );
    }

    const warehouseIds = Array.from(new Set(orders.map((o) => o.warehouseId)));
    if (dto.warehouseId && !warehouseIds.includes(dto.warehouseId)) {
      throw new BadRequestException('warehouseId does not match selected orders');
    }
    if (!dto.warehouseId && warehouseIds.length > 1) {
      throw new BadRequestException(
        'Selected orders belong to different warehouses',
      );
    }
    const warehouseId = dto.warehouseId || warehouseIds[0];
    const waveNumber = await this.generateWaveNumber(tenantId);

    const wave = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pickWave.create({
        data: {
          tenantId,
          waveNumber,
          warehouseId,
          status: PickWaveStatus.PENDING,
          totalOrders: orders.length,
        },
      });

      // 按订单明细拆分为波次项，优先分配到有库存的 bin
      for (const order of orders) {
        for (const item of order.items) {
          let remain = item.quantity;

          const invItems = await tx.inventoryItem.findMany({
            where: {
              tenantId,
              warehouseId,
              skuId: item.skuId,
              quantity: { gt: 0 },
            },
            orderBy: { binLocationId: 'asc' },
          });

          for (const inv of invItems) {
            if (remain <= 0) break;
            const available = inv.quantity - inv.lockedQty;
            if (available <= 0) continue;
            const take = Math.min(remain, available);
            remain -= take;
            await tx.pickWaveItem.create({
              data: {
                pickWaveId: created.id,
                salesOrderId: order.id,
                skuId: item.skuId,
                binLocationId: inv.binLocationId,
                requiredQty: take,
              },
            });
          }

          if (remain > 0) {
            // 缺货部分仍记录进波次，方便作业看板识别
            await tx.pickWaveItem.create({
              data: {
                pickWaveId: created.id,
                salesOrderId: order.id,
                skuId: item.skuId,
                binLocationId: null,
                requiredQty: remain,
              },
            });
          }
        }
      }

      return created;
    });

    return this.getWaveById(tenantId, wave.id);
  }

  // Updated: 2026-03-18T23:27:20 - 波次列表
  async listWaves(
    tenantId: string,
    params: { page?: number; limit?: number; status?: PickWaveStatus } = {},
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 20));
    const where: Prisma.PickWaveWhereInput = {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.pickWave.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pickWave.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Updated: 2026-03-18T23:27:45 - 波次详情
  async getWaveById(tenantId: string, id: string) {
    const wave = await this.prisma.pickWave.findFirst({
      where: { id, tenantId },
      include: {
        warehouse: true,
        items: {
          include: {
            binLocation: true,
          },
        },
      },
    });
    if (!wave) {
      throw new NotFoundException('Wave not found');
    }
    return wave;
  }

  // Updated: 2026-03-18T23:28:10 - 波次状态流转
  async updateWaveStatus(tenantId: string, id: string, status: PickWaveStatus) {
    await this.getWaveById(tenantId, id);
    return this.prisma.pickWave.update({
      where: { id },
      data: {
        status,
        startedAt: status === PickWaveStatus.IN_PROGRESS ? new Date() : undefined,
        completedAt: status === PickWaveStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }

  // Updated: 2026-03-18T23:28:40 - 生成波次拣货打印数据（按库位排序、SKU 合并）
  async getWavePickList(tenantId: string, id: string) {
    const wave = await this.getWaveById(tenantId, id);
    const skuIds = Array.from(new Set(wave.items.map((i) => i.skuId)));
    const skuMap = new Map(
      (
        await this.prisma.sku.findMany({
          where: { tenantId, id: { in: skuIds } },
          include: { product: true },
        })
      ).map((s) => [s.id, s]),
    );

    const merged = new Map<
      string,
      {
        binCode: string;
        skuCode: string;
        skuName: string;
        totalQty: number;
        orderBreakdown: Array<{ orderId: string; qty: number }>;
      }
    >();

    for (const item of wave.items) {
      const sku = skuMap.get(item.skuId);
      const binCode = item.binLocation?.code || '缺货';
      const skuCode = sku?.code || item.skuId;
      const skuName = sku?.product?.name || sku?.code || item.skuId;
      const key = `${binCode}::${skuCode}`;
      const old = merged.get(key);
      if (old) {
        old.totalQty += item.requiredQty;
        old.orderBreakdown.push({ orderId: item.salesOrderId, qty: item.requiredQty });
      } else {
        merged.set(key, {
          binCode,
          skuCode,
          skuName,
          totalQty: item.requiredQty,
          orderBreakdown: [{ orderId: item.salesOrderId, qty: item.requiredQty }],
        });
      }
    }

    return {
      waveId: wave.id,
      waveNumber: wave.waveNumber,
      warehouseId: wave.warehouseId,
      totalOrders: wave.totalOrders,
      status: wave.status,
      items: Array.from(merged.values()).sort((a, b) =>
        a.binCode.localeCompare(b.binCode),
      ),
    };
  }
}

