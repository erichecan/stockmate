// Updated: 2026-03-14 - 阶段二收货 6 状态/6 Tab + 操作日志
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { POStatus, ReceiptStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionLogService } from '../action-log/action-log.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { CreatePackingListItemDto } from './dto/create-packing-list-item.dto';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { PutawayCompleteDto } from './dto/receipt-phase-actions.dto';

/** 前端 Tab 阶段与 ReceiptStatus 映射（兼容旧值 PENDING/IN_PROGRESS） */
export const RECEIPT_PHASE_STATUS_MAP: Record<string, ReceiptStatus[]> = {
  NOTICE: [],
  PENDING_ARRIVAL: [ReceiptStatus.PENDING_ARRIVAL, ReceiptStatus.PENDING],
  ARRIVED: [ReceiptStatus.ARRIVED, ReceiptStatus.IN_PROGRESS],
  UNLOADED: [ReceiptStatus.UNLOADED],
  SORTED: [ReceiptStatus.SORTED],
  COMPLETED: [ReceiptStatus.COMPLETED],
};

@Injectable()
export class PurchasingService {
  constructor(
    private prisma: PrismaService,
    private actionLogService: ActionLogService,
    private inventoryService: InventoryService,
  ) {}

  /** Generate order number: PO-YYYYMMDD-XXXX */
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${dateStr}-`;
    const count = await this.prisma.purchaseOrder.count({
      where: {
        tenantId,
        orderNumber: { startsWith: prefix },
      },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  /** Generate receipt number: RCV-YYYYMMDD-XXXX */
  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RCV-${dateStr}-`;
    const count = await this.prisma.purchaseReceipt.count({
      where: {
        tenantId,
        receiptNumber: { startsWith: prefix },
      },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  // ==================== Purchase Orders ====================

  async createPO(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const orderNumber = await this.generateOrderNumber(tenantId);

    const po = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          tenantId,
          supplierId: dto.supplierId,
          currency: dto.currency ?? 'USD',
          notes: dto.notes,
        },
      });

      let totalAmount = 0;
      for (const item of dto.items) {
        const lineTotal = item.quantity * item.unitPrice;
        totalAmount += lineTotal;
        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: created.id,
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id: created.id },
        data: { totalAmount: new Prisma.Decimal(totalAmount) },
        include: {
          supplier: true,
          items: { include: { sku: { include: { product: true } } } },
        },
      });
    });

    await this.actionLogService.create({
      tenantId,
      userId,
      action: 'create',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      payload: { orderNumber: po.orderNumber, supplierId: dto.supplierId },
    });
    return po;
  }

  async findAllPOs(
    tenantId: string,
    status?: POStatus,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { tenantId, ...(status && { status }) };

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOnePO(id: string, tenantId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        items: { include: { sku: { include: { product: true } } } },
        shipments: true,
        receipts: { include: { items: true } },
      },
    });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }

  async updatePO(id: string, tenantId: string, userId: string, dto: UpdatePurchaseOrderDto) {
    await this.findOnePO(id, tenantId);

    const data: Record<string, unknown> = { ...dto };
    if (dto.expectedAt) {
      data.expectedAt = new Date(dto.expectedAt);
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data,
      include: {
        supplier: true,
        items: { include: { sku: { include: { product: true } } } },
      },
    });

    await this.actionLogService.create({
      tenantId,
      userId,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId: id,
      payload: dto as Prisma.InputJsonValue,
    });
    return updated;
  }

  async cancelPO(id: string, tenantId: string, userId: string) {
    const po = await this.findOnePO(id, tenantId);
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.CANCELLED },
      include: { supplier: true },
    });

    await this.actionLogService.create({
      tenantId,
      userId,
      action: 'cancel',
      entityType: 'PurchaseOrder',
      entityId: id,
      payload: { orderNumber: po.orderNumber },
    });
    return updated;
  }

  // ==================== Shipments ====================

  async createShipment(tenantId: string, dto: CreateShipmentDto) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, tenantId },
    });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return this.prisma.shipment.create({
      data: {
        purchaseOrderId: dto.purchaseOrderId,
        tenantId,
        containerNo: dto.containerNo,
        vesselName: dto.vesselName,
        etd: dto.etd ? new Date(dto.etd) : undefined,
        eta: dto.eta ? new Date(dto.eta) : undefined,
        portOfLoading: dto.portOfLoading,
        portOfDischarge: dto.portOfDischarge,
        shippingCost: dto.shippingCost != null ? new Prisma.Decimal(dto.shippingCost) : undefined,
      },
      include: { purchaseOrder: true },
    });
  }

  async updateShipment(id: string, tenantId: string, dto: UpdateShipmentDto) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, tenantId },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.etd) data.etd = new Date(dto.etd);
    if (dto.eta) data.eta = new Date(dto.eta);
    if (dto.shippingCost != null) data.shippingCost = new Prisma.Decimal(dto.shippingCost);

    return this.prisma.shipment.update({
      where: { id },
      data,
      include: { purchaseOrder: true },
    });
  }

  async findShipments(tenantId: string, poId?: string) {
    const where = { tenantId, ...(poId && { purchaseOrderId: poId }) };
    return this.prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { purchaseOrder: true, packingLists: true },
    });
  }

  // ==================== Packing Lists ====================

  async addPackingItems(
    shipmentId: string,
    tenantId: string,
    items: CreatePackingListItemDto[],
  ) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, tenantId },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    await this.prisma.packingListItem.createMany({
      data: items.map((item) => ({
        shipmentId,
        cartonNo: item.cartonNo,
        skuCode: item.skuCode,
        skuName: item.skuName,
        quantity: item.quantity,
        grossWeight: item.grossWeight != null ? new Prisma.Decimal(item.grossWeight) : undefined,
        netWeight: item.netWeight != null ? new Prisma.Decimal(item.netWeight) : undefined,
        cbm: item.cbm != null ? new Prisma.Decimal(item.cbm) : undefined,
      })),
    });
    return this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { packingLists: true, purchaseOrder: true },
    });
  }

  // ==================== Receipts ====================

  async createReceipt(tenantId: string, userId: string, dto: CreateReceiptDto) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, tenantId },
      include: { items: true },
    });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const receiptNumber = await this.generateReceiptNumber(tenantId);
    const poItemMap = new Map(po.items.map((i) => [i.id, i]));

    const receipt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: dto.purchaseOrderId,
          tenantId,
          notes: dto.notes,
        },
      });

      for (const item of dto.items) {
        const poItem = poItemMap.get(item.poItemId);
        if (!poItem) {
          throw new BadRequestException(`PO item ${item.poItemId} not found`);
        }

        const damagedQty = item.damagedQty ?? 0;
        if (item.receivedQty + damagedQty > poItem.quantity) {
          throw new BadRequestException(
            `Received + damaged quantity exceeds ordered for item ${item.poItemId}`,
          );
        }

        await tx.receiptItem.create({
          data: {
            receiptId: created.id,
            poItemId: item.poItemId,
            expectedQty: poItem.quantity,
            receivedQty: item.receivedQty,
            damagedQty,
            discrepancyType: item.discrepancyType,
            notes: item.notes,
          },
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.poItemId },
          data: {
            receivedQty: { increment: item.receivedQty },
          },
        });
      }

      return tx.purchaseReceipt.findUnique({
        where: { id: created.id },
        include: {
          purchaseOrder: true,
          items: { include: { poItem: true } },
        },
      });
    });

    if (receipt) {
      await this.actionLogService.create({
        tenantId,
        userId,
        action: 'create',
        entityType: 'PurchaseReceipt',
        entityId: receipt.id,
        payload: { receiptNumber: receipt.receiptNumber, purchaseOrderId: dto.purchaseOrderId },
      });
    }
    return receipt;
  }

  async findReceipts(tenantId: string, purchaseOrderId?: string) {
    const where = { tenantId, ...(purchaseOrderId && { purchaseOrderId }) };
    return this.prisma.purchaseReceipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { purchaseOrder: true, items: { include: { poItem: true } } },
    });
  }

  // ==================== 阶段二：按阶段分页查询收货列表（6 Tab）====================
  // 2026-03-14 参考 ModernWMS Asnmaster/list

  async listReceiptsByPhase(
    tenantId: string,
    phase: string,
    page: number,
    limit: number,
  ) {
    const statuses = RECEIPT_PHASE_STATUS_MAP[phase];
    const where: Prisma.PurchaseReceiptWhereInput = { tenantId };
    if (phase === 'NOTICE') {
      where.status = { not: ReceiptStatus.CANCELLED };
    } else if (statuses?.length) {
      where.status = { in: statuses };
    } else {
      where.status = { not: ReceiptStatus.CANCELLED };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.purchaseReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          purchaseOrder: { include: { supplier: true } },
          items: { include: { poItem: { include: { sku: { include: { product: true } } } } } },
        },
      }),
      this.prisma.purchaseReceipt.count({ where }),
    ]);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /** 确认到货：PENDING_ARRIVAL/PENDING -> ARRIVED，设置 receivedAt */
  async confirmArrival(tenantId: string, receiptIds: string[]) {
    const statusIn = [ReceiptStatus.PENDING_ARRIVAL, ReceiptStatus.PENDING];
    const receipts = await this.prisma.purchaseReceipt.findMany({
      where: { id: { in: receiptIds }, tenantId, status: { in: statusIn } },
    });
    if (receipts.length !== receiptIds.length) {
      throw new BadRequestException('部分收货单状态不允许确认到货或不存在');
    }
    await this.prisma.purchaseReceipt.updateMany({
      where: { id: { in: receiptIds }, tenantId },
      data: { status: ReceiptStatus.ARRIVED, receivedAt: new Date() },
    });
    return { updated: receiptIds.length };
  }

  /** 确认卸货：ARRIVED/IN_PROGRESS -> UNLOADED */
  async confirmUnload(tenantId: string, receiptIds: string[]) {
    const statusIn = [ReceiptStatus.ARRIVED, ReceiptStatus.IN_PROGRESS];
    const receipts = await this.prisma.purchaseReceipt.findMany({
      where: { id: { in: receiptIds }, tenantId, status: { in: statusIn } },
    });
    if (receipts.length !== receiptIds.length) {
      throw new BadRequestException('部分收货单状态不允许确认卸货或不存在');
    }
    await this.prisma.purchaseReceipt.updateMany({
      where: { id: { in: receiptIds }, tenantId },
      data: { status: ReceiptStatus.UNLOADED },
    });
    return { updated: receiptIds.length };
  }

  /** 分拣完成：UNLOADED -> SORTED */
  async sortingComplete(tenantId: string, receiptIds: string[]) {
    const receipts = await this.prisma.purchaseReceipt.findMany({
      where: { id: { in: receiptIds }, tenantId, status: ReceiptStatus.UNLOADED },
    });
    if (receipts.length !== receiptIds.length) {
      throw new BadRequestException('部分收货单状态不允许分拣完成或不存在');
    }
    await this.prisma.purchaseReceipt.updateMany({
      where: { id: { in: receiptIds }, tenantId },
      data: { status: ReceiptStatus.SORTED },
    });
    return { updated: receiptIds.length };
  }

  /** 上架完成：调用 inventory.inbound 按明细入库，SORTED -> COMPLETED */
  async putawayComplete(
    tenantId: string,
    userId: string,
    receiptId: string,
    dto: PutawayCompleteDto,
  ) {
    const receipt = await this.prisma.purchaseReceipt.findFirst({
      where: { id: receiptId, tenantId, status: ReceiptStatus.SORTED },
      include: {
        items: {
          include: { poItem: { include: { sku: true } } },
        },
      },
    });
    if (!receipt) {
      throw new NotFoundException('收货单不存在或状态不是待上架');
    }
    const itemBinMap = new Map<string, string | undefined>();
    if (dto.items?.length) {
      for (const it of dto.items) {
        if (it.receiptItemId) {
          itemBinMap.set(it.receiptItemId, it.binLocationId);
        }
      }
    }
    for (const item of receipt.items) {
      const skuId = item.poItem.skuId;
      const qty = item.receivedQty;
      if (qty <= 0) continue;
      const binLocationId = itemBinMap.get(item.id);
      await this.inventoryService.inbound(tenantId, userId, {
        skuId,
        warehouseId: dto.warehouseId,
        binLocationId,
        quantity: qty,
        referenceType: 'PURCHASE_RECEIPT',
        referenceId: receiptId,
        notes: `收货单 ${receipt.receiptNumber}`,
      });
    }
    await this.prisma.purchaseReceipt.update({
      where: { id: receiptId },
      data: { status: ReceiptStatus.COMPLETED },
    });
    return { receiptId, completed: true };
  }
}
