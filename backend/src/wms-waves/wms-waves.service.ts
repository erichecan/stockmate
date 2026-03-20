// Updated: 2026-03-18T23:31:40 - 正式 WMS 波次实体服务
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PickWaveStatus, Prisma, SOStatus, UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Updated: 2026-03-19T11:40:10 - 通知仓库/运营/管理角色，保证批发与仓库作业状态联动
  private async notifyWaveRoles(
    tenantId: string,
    input: {
      type: string;
      title: string;
      body: string;
      payload: Record<string, unknown>;
      roles?: UserRole[];
    },
  ) {
    const roles = input.roles ?? [
      UserRole.ADMIN,
      UserRole.OPERATIONS,
      UserRole.WAREHOUSE,
      // Updated: 2026-03-19T15:14:57 - 仓库拣货员也需要接收波次作业通知
      UserRole.PICKER,
    ];
    const targets = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: roles },
      },
      select: { id: true },
    });
    if (!targets.length) return;
    await Promise.all(
      targets.map((user) =>
        this.notificationsService.createEvent({
          tenantId,
          type: input.type,
          title: input.title,
          body: input.body,
          payload: input.payload,
          targetUserId: user.id,
        }),
      ),
    );
  }

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
    const orderIds = Array.from(
      new Set(dto.orderIds.map((id) => id.trim())),
    ).filter(Boolean);
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
      throw new BadRequestException(
        'warehouseId does not match selected orders',
      );
    }
    if (!dto.warehouseId && warehouseIds.length > 1) {
      throw new BadRequestException(
        'Selected orders belong to different warehouses',
      );
    }
    const warehouseId = dto.warehouseId || warehouseIds[0];
    const waveNumber = await this.generateWaveNumber(tenantId);
    const createWaveWithClient = async (db: PrismaService) => {
      const created = await db.pickWave.create({
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

          const invItems = await db.inventoryItem.findMany({
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
            await db.pickWaveItem.create({
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
            await db.pickWaveItem.create({
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
    };

    let wave;
    try {
      wave = await this.prisma.$transaction(async (tx) => {
        return createWaveWithClient(tx as unknown as PrismaService);
      });
    } catch (error: unknown) {
      // Updated: 2026-03-19T11:19:05 - Neon WebSocket 事务偶发失败时回退非事务创建，避免波次功能不可用
      const message = error instanceof Error ? error.message : String(error);
      const isNeonTransactionError =
        /websocket|starttransaction|all attempts to open a websocket/i.test(
          message,
        );
      if (!isNeonTransactionError) {
        throw error;
      }
      wave = await createWaveWithClient(this.prisma);
    }

    await this.notifyWaveRoles(tenantId, {
      type: 'WAVE_CREATED',
      title: `新波次已创建：${wave.waveNumber}`,
      body: `波次 ${wave.waveNumber} 已创建，包含 ${wave.totalOrders} 张订单，请仓库开始拣货作业。`,
      payload: {
        waveId: wave.id,
        waveNumber: wave.waveNumber,
        status: wave.status,
        totalOrders: wave.totalOrders,
      },
    });

    return this.getWaveById(tenantId, wave.id);
  }

  /** 仓库拣货看板顶部 KPI（待处理订单 / 待处理波次 / 待处理波次内缺货行数） */
  // Updated: 2026-03-20T07:20:45-0400
  async getPickingDashboardSummary(tenantId: string) {
    const [pendingOrdersCount, pendingWavesCount, shortageItemsCount] =
      await Promise.all([
        this.prisma.salesOrder.count({
          where: {
            tenantId,
            status: { in: WAVE_ELIGIBLE_ORDER_STATUS },
          },
        }),
        this.prisma.pickWave.count({
          where: {
            tenantId,
            status: {
              in: [PickWaveStatus.PENDING, PickWaveStatus.IN_PROGRESS],
            },
          },
        }),
        this.prisma.pickWaveItem.count({
          where: {
            binLocationId: null,
            pickWave: {
              tenantId,
              status: {
                in: [PickWaveStatus.PENDING, PickWaveStatus.IN_PROGRESS],
              },
            },
          },
        }),
      ]);
    return {
      pendingOrdersCount,
      pendingWavesCount,
      shortageItemsCount,
    };
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
    const existing = await this.getWaveById(tenantId, id);
    const updated = await this.prisma.pickWave.update({
      where: { id },
      data: {
        status,
        startedAt:
          status === PickWaveStatus.IN_PROGRESS ? new Date() : undefined,
        completedAt:
          status === PickWaveStatus.COMPLETED ? new Date() : undefined,
      },
    });
    await this.notifyWaveRoles(tenantId, {
      type: 'WAVE_STATUS_UPDATED',
      title: `波次状态更新：${updated.waveNumber}`,
      body: `波次 ${updated.waveNumber} 状态由 ${existing.status} 更新为 ${updated.status}。`,
      payload: {
        waveId: updated.id,
        waveNumber: updated.waveNumber,
        previousStatus: existing.status,
        currentStatus: updated.status,
      },
    });
    return updated;
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
        shortage: boolean;
        orderBreakdown: Array<{ orderId: string; qty: number }>;
      }
    >();

    for (const item of wave.items) {
      const sku = skuMap.get(item.skuId);
      // Updated: 2026-03-19T11:22:06 - Bin 仅显示库位，缺货语义交由 shortage/Qty 展示
      const binCode = item.binLocation?.code || '-';
      const skuCode = sku?.code || item.skuId;
      const skuName = sku?.product?.name || sku?.code || item.skuId;
      const shortage = !item.binLocationId;
      const key = `${binCode}::${skuCode}`;
      const old = merged.get(key);
      if (old) {
        old.totalQty += item.requiredQty;
        old.orderBreakdown.push({
          orderId: item.salesOrderId,
          qty: item.requiredQty,
        });
        old.shortage = old.shortage || shortage;
      } else {
        merged.set(key, {
          binCode,
          skuCode,
          skuName,
          totalQty: item.requiredQty,
          shortage,
          orderBreakdown: [
            { orderId: item.salesOrderId, qty: item.requiredQty },
          ],
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
