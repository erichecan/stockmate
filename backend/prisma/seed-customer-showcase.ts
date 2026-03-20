/**
 * 客户演示专用种子：固定单号 SO-DEMO-SHOW-*，覆盖订单全链路状态 + 未付发票 + 演示波次 + 演示退货。
 * 与 PRD 演示场景对齐：订单处理看板、拣货看板、退货工作台、财务未结。
 * Created: 2026-03-19T18:52:00
 * Updated: 2026-03-19T18:55:00
 *
 * 依赖：主 seed、seed-warehouse-inventory、seed-sales、seed-demo-users（租户 test-company）
 * Usage: cd backend && npm run seed:showcase
 */
import 'dotenv/config';
import {
  InvoiceStatus,
  OrderSource,
  PickWaveStatus,
  Prisma,
  PrismaClient,
  ReturnCondition,
  ReturnDisposition,
  ReturnStatus,
  SOStatus,
  UserRole,
} from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const ORDER_PREFIX = 'SO-DEMO-SHOW-';
const WAVE_NUMBER = 'WV-DEMO-SHOW-001';
const INVOICE_UNPAID_NO = 'INV-DEMO-SHOW-UNPAID';

type LineSpec = { quantity: number; pickedQty: number };

type OrderSpec = {
  suffix: string;
  status: SOStatus;
  source: OrderSource;
  notes: string;
  lines: LineSpec[];
  /** 是否写入 shippedAt（演示在途） */
  withShippedAt?: boolean;
};

const ORDER_SPECS: OrderSpec[] = [
  {
    suffix: '01',
    status: SOStatus.DRAFT,
    source: OrderSource.WHOLESALE_SITE,
    notes: '【演示】批发站草稿单，客户未提交',
    lines: [{ quantity: 4, pickedQty: 0 }],
  },
  {
    suffix: '02',
    status: SOStatus.DRAFT,
    source: OrderSource.MANUAL,
    notes: '【演示】销售代客草稿，待确认明细',
    lines: [
      { quantity: 3, pickedQty: 0 },
      { quantity: 2, pickedQty: 0 },
    ],
  },
  {
    suffix: '03',
    status: SOStatus.PENDING,
    source: OrderSource.WHOLESALE_SITE,
    notes: '【演示】待审核 — 批发站新单',
    lines: [{ quantity: 6, pickedQty: 0 }],
  },
  {
    suffix: '04',
    status: SOStatus.PENDING,
    source: OrderSource.SALES_REP,
    notes: '【演示】待审核 + 关联未付发票（看「未支付成功」列表）',
    lines: [
      { quantity: 5, pickedQty: 0 },
      { quantity: 4, pickedQty: 0 },
    ],
  },
  {
    suffix: '05',
    status: SOStatus.CONFIRMED,
    source: OrderSource.MANUAL,
    notes: '【演示】已确认，待加入波次拣货',
    lines: [{ quantity: 8, pickedQty: 0 }],
  },
  {
    suffix: '06',
    status: SOStatus.CONFIRMED,
    source: OrderSource.WHOLESALE_SITE,
    notes: '【演示】已确认（与 05 同在一个演示波次）',
    lines: [
      { quantity: 4, pickedQty: 0 },
      { quantity: 3, pickedQty: 0 },
    ],
  },
  {
    suffix: '07',
    status: SOStatus.PICKING,
    source: OrderSource.MANUAL,
    notes: '【演示】拣货中 — 部分行已拣',
    lines: [
      { quantity: 6, pickedQty: 2 },
      { quantity: 5, pickedQty: 0 },
    ],
  },
  {
    suffix: '08',
    status: SOStatus.PICKING,
    source: OrderSource.WHOLESALE_SITE,
    notes: '【演示】拣货中 — 整单进行中',
    lines: [{ quantity: 7, pickedQty: 3 }],
  },
  {
    suffix: '09',
    status: SOStatus.PACKED,
    source: OrderSource.MANUAL,
    notes: '【演示】已打包，待发运',
    lines: [
      { quantity: 5, pickedQty: 5 },
      { quantity: 3, pickedQty: 3 },
    ],
  },
  {
    suffix: '10',
    status: SOStatus.SHIPPED,
    source: OrderSource.SALES_REP,
    notes: '【演示】已发运在途',
    lines: [{ quantity: 6, pickedQty: 6 }],
    withShippedAt: true,
  },
  {
    suffix: '11',
    status: SOStatus.PARTIALLY_FULFILLED,
    source: OrderSource.MANUAL,
    notes: '【演示】部分出库 — 一单多行进度不一致',
    lines: [
      { quantity: 8, pickedQty: 8 },
      { quantity: 6, pickedQty: 2 },
    ],
  },
  {
    suffix: '12',
    status: SOStatus.CANCELLED,
    source: OrderSource.MANUAL,
    notes: '【演示】已取消订单（筛选「全部」可见）',
    lines: [{ quantity: 4, pickedQty: 0 }],
  },
];

function orderNumber(suffix: string): string {
  return `${ORDER_PREFIX}${suffix}`;
}

async function ensureOrderWithItems(
  tenantId: string,
  warehouseId: string,
  customerId: string,
  spec: OrderSpec,
  skus: { id: string; wholesalePrice: Prisma.Decimal | null }[],
): Promise<{ id: string; orderNumber: string; totalAmount: Prisma.Decimal }> {
  const on = orderNumber(spec.suffix);
  const existing = await prisma.salesOrder.findUnique({
    where: { orderNumber_tenantId: { orderNumber: on, tenantId } },
    include: { items: true },
  });

  let total = 0;
  const linePayload = spec.lines.map((line, idx) => {
    const sku = skus[idx % skus.length];
    const unit = Number(sku.wholesalePrice ?? 5);
    total += unit * line.quantity;
    return {
      skuId: sku.id,
      quantity: line.quantity,
      unitPrice: new Prisma.Decimal(unit),
      pickedQty: line.pickedQty,
    };
  });

  const shippedAt =
    spec.withShippedAt ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : null;

  if (existing) {
    // Updated: 2026-03-19T18:55:00 - 演示单每次重跑重置行项目，避免与历史手工改单不一致
    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: existing.id } });
    await prisma.salesOrder.update({
      where: { id: existing.id },
      data: {
        status: spec.status,
        source: spec.source,
        notes: spec.notes,
        shippedAt,
        totalAmount: new Prisma.Decimal(total),
      },
    });
    for (const row of linePayload) {
      await prisma.salesOrderItem.create({
        data: { salesOrderId: existing.id, ...row },
      });
    }
    return {
      id: existing.id,
      orderNumber: on,
      totalAmount: new Prisma.Decimal(total),
    };
  }

  const created = await prisma.salesOrder.create({
    data: {
      orderNumber: on,
      tenantId,
      customerId,
      warehouseId,
      status: spec.status,
      source: spec.source,
      notes: spec.notes,
      currency: 'EUR',
      totalAmount: new Prisma.Decimal(total),
      orderedAt: new Date(),
      shippedAt,
    },
  });
  for (const row of linePayload) {
    await prisma.salesOrderItem.create({
      data: { salesOrderId: created.id, ...row },
    });
  }
  return { id: created.id, orderNumber: on, totalAmount: new Prisma.Decimal(total) };
}

async function main() {
  console.log('🌱 客户演示专用种子（SO-DEMO-SHOW-*）...\n');

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'test-company' } });
  if (!tenant) throw new Error('Tenant test-company not found. Run main seed first.');
  const tenantId = tenant.id;

  const mainWh = await prisma.warehouse.findFirst({ where: { tenantId } });
  if (!mainWh) throw new Error('No warehouse. Run seed-warehouse-inventory first.');

  const skus = await prisma.sku.findMany({
    where: { tenantId },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });
  if (skus.length === 0) throw new Error('No SKUs. Run main seed first.');

  const customers = await prisma.customer.findMany({
    where: { tenantId },
    take: 15,
    orderBy: { createdAt: 'asc' },
  });
  if (customers.length === 0) throw new Error('No customers. Run seed-sales first.');

  const picker = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.PICKER, isActive: true },
  });
  const warehouseUser = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.WAREHOUSE, isActive: true },
  });
  const returnUser = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.RETURN_SPECIALIST, isActive: true },
  });
  const assigneeId = picker?.id ?? warehouseUser?.id ?? null;

  const ordersBySuffix = new Map<string, { id: string; orderNumber: string; totalAmount: Prisma.Decimal }>();

  console.log('📋 确保演示销售单...');
  for (let i = 0; i < ORDER_SPECS.length; i++) {
    const spec = ORDER_SPECS[i];
    const customer = customers[i % customers.length];
    const result = await ensureOrderWithItems(tenantId, mainWh.id, customer.id, spec, skus);
    ordersBySuffix.set(spec.suffix, result);
    console.log(`   ✅ ${result.orderNumber} (${spec.status})`);
  }

  // 未付发票：绑定 SO-DEMO-SHOW-04
  const order04 = ordersBySuffix.get('04');
  if (order04) {
    const o = await prisma.salesOrder.findUnique({
      where: { id: order04.id },
      include: { customer: true, items: true },
    });
    if (o) {
      let total = 0;
      for (const it of o.items) {
        total += Number(it.unitPrice) * it.quantity;
      }
      const existingInv = await prisma.invoice.findUnique({
        where: { invoiceNo_tenantId: { invoiceNo: INVOICE_UNPAID_NO, tenantId } },
      });
      if (!existingInv) {
        await prisma.invoice.create({
          data: {
            invoiceNo: INVOICE_UNPAID_NO,
            tenantId,
            customerId: o.customerId,
            orderId: o.id,
            amount: new Prisma.Decimal(total),
            paidAmount: new Prisma.Decimal(0),
            status: InvoiceStatus.UNPAID,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        });
        console.log(`\n🧾 已创建未付发票 ${INVOICE_UNPAID_NO} → ${o.orderNumber}`);
      } else {
        await prisma.invoice.update({
          where: { id: existingInv.id },
          data: {
            orderId: o.id,
            customerId: o.customerId,
            amount: new Prisma.Decimal(total),
            paidAmount: new Prisma.Decimal(0),
            status: InvoiceStatus.UNPAID,
          },
        });
        console.log(`\n🧾 已同步未付发票 ${INVOICE_UNPAID_NO} → ${o.orderNumber}`);
      }
    }
  }

  // 演示波次：含 05、06
  console.log('\n📦 确保演示拣货波次...');
  const o5 = await prisma.salesOrder.findUnique({
    where: { orderNumber_tenantId: { orderNumber: orderNumber('05'), tenantId } },
    include: { items: true },
  });
  const o6 = await prisma.salesOrder.findUnique({
    where: { orderNumber_tenantId: { orderNumber: orderNumber('06'), tenantId } },
    include: { items: true },
  });
  let wave = await prisma.pickWave.findFirst({
    where: { tenantId, waveNumber: WAVE_NUMBER },
    include: { items: true },
  });
  const bin = await prisma.binLocation.findFirst({
    where: { tenantId, warehouseId: mainWh.id },
  });

  const orderCount = (o5 ? 1 : 0) + (o6 ? 1 : 0);
  if (!wave) {
    const startedAt = new Date();
    startedAt.setHours(10, 15, 0, 0);
    wave = await prisma.pickWave.create({
      data: {
        tenantId,
        waveNumber: WAVE_NUMBER,
        warehouseId: mainWh.id,
        status: PickWaveStatus.IN_PROGRESS,
        totalOrders: orderCount,
        assigneeId,
        startedAt,
        completedAt: null,
      },
      include: { items: true },
    });
    console.log(`   ✅ 创建波次 ${WAVE_NUMBER}`);
  } else {
    await prisma.pickWave.update({
      where: { id: wave.id },
      data: {
        status: PickWaveStatus.IN_PROGRESS,
        totalOrders: orderCount || wave.totalOrders,
        assigneeId: assigneeId ?? wave.assigneeId,
      },
    });
    console.log(`   ⏭️ 波次 ${WAVE_NUMBER} 已存在，已刷新状态/指派`);
  }

  const waveId = wave.id;
  // Updated: 2026-03-19T18:55:00 - 每次重跑重建波次行，与 05/06 当前行项目一致
  await prisma.pickWaveItem.deleteMany({ where: { pickWaveId: waveId } });

  const appendWaveLines = async (order: typeof o5) => {
    if (!order) return;
    for (const item of order.items) {
      await prisma.pickWaveItem.create({
        data: {
          pickWaveId: waveId,
          salesOrderId: order.id,
          skuId: item.skuId,
          binLocationId: bin?.id ?? null,
          requiredQty: item.quantity,
          pickedQty: Math.min(item.pickedQty, item.quantity),
        },
      });
    }
  };

  await appendWaveLines(o5);
  await appendWaveLines(o6);
  console.log('   ✅ 波次行已对齐演示订单 05 / 06');

  // 演示退货一条（可重复执行：按 intakeNotes 标记去重）
  console.log('\n🔙 确保演示退货登记...');
  const demoReturnMarker = '[DEMO-SHOWCASE-RETURN]';
  const existingDemoReturn = await prisma.returnRecord.findFirst({
    where: { tenantId, intakeNotes: { contains: demoReturnMarker } },
  });
  const shipOrder = await prisma.salesOrder.findUnique({
    where: { orderNumber_tenantId: { orderNumber: orderNumber('10'), tenantId } },
    include: { items: { take: 1 } },
  });
  if (!existingDemoReturn && shipOrder?.items[0] && returnUser) {
    await prisma.returnRecord.create({
      data: {
        tenantId,
        sourceOrderId: shipOrder.id,
        sourceOrderNumber: shipOrder.orderNumber,
        skuId: shipOrder.items[0].skuId,
        returnedQty: 2,
        status: ReturnStatus.RECEIVED,
        condition: ReturnCondition.GOOD,
        disposition: ReturnDisposition.PENDING,
        issueDescription: '【演示】客户称发错颜色，待匹配原单',
        intakeNotes: `${demoReturnMarker} 客户演示数据，可在此单上走匹配/核对流程`,
        receivedByUserId: returnUser.id,
      },
    });
    console.log('   ✅ 已创建演示退货（关联 SO-DEMO-SHOW-10）');
  } else if (existingDemoReturn) {
    console.log('   ⏭️ 演示退货已存在，跳过');
  } else {
    console.log('   ⚠️ 跳过演示退货（缺少退货专员用户或订单行）');
  }

  console.log('\n🎉 客户演示种子完成。前端可搜索单号前缀 SO-DEMO-SHOW- 或发票 INV-DEMO-SHOW-UNPAID。');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
