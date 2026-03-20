// Updated: 2026-03-19T15:34:02 - 退货服务单测
import { ReturnDisposition, ReturnStatus } from '@prisma/client';
import { ReturnsService } from './returns.service';

describe('ReturnsService', () => {
  const tenantId = 'tenant-1';
  const operatorUserId = 'user-1';

  it('creates MATCHED record when order and sku are provided', async () => {
    const prisma = {
      salesOrder: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'SO-1' }),
      },
      sku: {
        findFirst: jest.fn().mockResolvedValue({ id: 'sku-1' }),
      },
      returnRecord: {
        create: jest.fn().mockResolvedValue({ id: 'ret-1', status: ReturnStatus.MATCHED }),
      },
    } as any;
    const service = new ReturnsService(prisma);

    const result = await service.createReturnRecord(tenantId, operatorUserId, {
      sourceOrderId: 'order-1',
      skuId: 'sku-1',
      returnedQty: 2,
    });

    expect(prisma.returnRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          status: ReturnStatus.MATCHED,
          disposition: ReturnDisposition.PENDING,
        }),
      }),
    );
    expect(result.id).toBe('ret-1');
  });

  it('creates RECEIVED record when order/sku are missing', async () => {
    const prisma = {
      salesOrder: { findFirst: jest.fn() },
      sku: { findFirst: jest.fn() },
      returnRecord: {
        create: jest.fn().mockResolvedValue({ id: 'ret-2', status: ReturnStatus.RECEIVED }),
      },
    } as any;
    const service = new ReturnsService(prisma);

    const result = await service.createReturnRecord(tenantId, operatorUserId, {
      returnedQty: 1,
      sourceOrderNumber: 'manual-order',
    });

    expect(prisma.returnRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          status: ReturnStatus.RECEIVED,
        }),
      }),
    );
    expect(result.id).toBe('ret-2');
  });
});
