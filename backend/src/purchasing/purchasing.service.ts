// Updated: 2026-02-28T10:00:00
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { CreatePackingListItemDto } from './dto/create-packing-list-item.dto';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { POStatus } from '@prisma/client';

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService) {}

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

  async createPO(tenantId: string, dto: CreatePurchaseOrderDto) {
    const orderNumber = await this.generateOrderNumber(tenantId);

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
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
            purchaseOrderId: po.id,
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id: po.id },
        data: { totalAmount: new Prisma.Decimal(totalAmount) },
        include: {
          supplier: true,
          items: { include: { sku: { include: { product: true } } } },
        },
      });
    });
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

  async updatePO(id: string, tenantId: string, dto: UpdatePurchaseOrderDto) {
    await this.findOnePO(id, tenantId);

    const data: Record<string, unknown> = { ...dto };
    if (dto.expectedAt) {
      data.expectedAt = new Date(dto.expectedAt);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data,
      include: {
        supplier: true,
        items: { include: { sku: { include: { product: true } } } },
      },
    });
  }

  async cancelPO(id: string, tenantId: string) {
    await this.findOnePO(id, tenantId);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.CANCELLED },
      include: { supplier: true },
    });
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

  async createReceipt(tenantId: string, dto: CreateReceiptDto) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, tenantId },
      include: { items: true },
    });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const receiptNumber = await this.generateReceiptNumber(tenantId);
    const poItemMap = new Map(po.items.map((i) => [i.id, i]));

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.purchaseReceipt.create({
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
            receiptId: receipt.id,
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
        where: { id: receipt.id },
        include: {
          purchaseOrder: true,
          items: { include: { poItem: true } },
        },
      });
    });
  }

  async findReceipts(tenantId: string, purchaseOrderId?: string) {
    const where = { tenantId, ...(purchaseOrderId && { purchaseOrderId }) };
    return this.prisma.purchaseReceipt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { purchaseOrder: true, items: { include: { poItem: true } } },
    });
  }
}
