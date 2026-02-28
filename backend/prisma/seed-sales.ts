/**
 * 销售部分种子数据：客户 + 销售订单
 * Updated: 2026-02-28T15:30:00
 *
 * 创建至少 30 条记录：20 客户 + 20+ 销售订单
 * 依赖：需先运行主 seed 和 seed-warehouse-inventory（仓库、SKU、库存）
 *
 * Usage: cd backend && npx tsx prisma/seed-sales.ts
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const TIER_DISCOUNT: Record<string, number> = {
  NORMAL: 1.0,
  SILVER: 0.98,
  GOLD: 0.95,
  VIP: 0.9,
};

function getUnitPrice(wholesalePrice: number | null, tier: string): number {
  const base = wholesalePrice ?? 0;
  return base * (TIER_DISCOUNT[tier] ?? 1);
}

async function main() {
  console.log('🌱 销售部分种子数据...\n');

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'test-company' } });
  if (!tenant) {
    throw new Error('Tenant test-company not found. Run main seed first.');
  }
  const tenantId = tenant.id;

  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId },
    take: 3,
  });
  if (warehouses.length === 0) {
    throw new Error('No warehouses. Run seed-warehouse-inventory first.');
  }
  const mainWh = warehouses[0];

  const skus = await prisma.sku.findMany({
    where: { tenantId },
    include: { product: true },
    take: 40,
  });
  if (skus.length === 0) {
    throw new Error('No SKUs. Run main seed first.');
  }

  // ===== 1. 客户 (20 条) =====
  const customerTemplates: Array<{
    name: string;
    code: string;
    contactName: string;
    city: string;
    country: string;
    tier: 'NORMAL' | 'SILVER' | 'GOLD' | 'VIP';
  }> = [
    { name: 'Tech Retail GmbH', code: 'CUST-001', contactName: 'Maria Schmidt', city: 'Berlin', country: 'Germany', tier: 'GOLD' },
    { name: 'Mobile Accessories EU', code: 'CUST-002', contactName: 'Hans Weber', city: 'Munich', country: 'Germany', tier: 'VIP' },
    { name: 'PhoneStyle France', code: 'CUST-003', contactName: 'Pierre Dubois', city: 'Paris', country: 'France', tier: 'SILVER' },
    { name: 'GadgetZone UK', code: 'CUST-004', contactName: 'James Wilson', city: 'London', country: 'UK', tier: 'GOLD' },
    { name: 'SmartCase Italia', code: 'CUST-005', contactName: 'Marco Rossi', city: 'Milan', country: 'Italy', tier: 'NORMAL' },
    { name: 'AccessoryHub Spain', code: 'CUST-006', contactName: 'Carlos Garcia', city: 'Barcelona', country: 'Spain', tier: 'SILVER' },
    { name: 'CaseWorld Netherlands', code: 'CUST-007', contactName: 'Jan de Vries', city: 'Amsterdam', country: 'Netherlands', tier: 'NORMAL' },
    { name: 'MobilePro Poland', code: 'CUST-008', contactName: 'Piotr Kowalski', city: 'Warsaw', country: 'Poland', tier: 'GOLD' },
    { name: 'PhoneProtect Scandinavia', code: 'CUST-009', contactName: 'Erik Nilsson', city: 'Stockholm', country: 'Sweden', tier: 'VIP' },
    { name: 'EuroCase Distribution', code: 'CUST-010', contactName: 'Anna Mueller', city: 'Frankfurt', country: 'Germany', tier: 'GOLD' },
    { name: 'TechGear Belgium', code: 'CUST-011', contactName: 'Sophie Laurent', city: 'Brussels', country: 'Belgium', tier: 'SILVER' },
    { name: 'CaseFactory Austria', code: 'CUST-012', contactName: 'Thomas Bauer', city: 'Vienna', country: 'Austria', tier: 'NORMAL' },
    { name: 'MobileOutlet Portugal', code: 'CUST-013', contactName: 'João Silva', city: 'Lisbon', country: 'Portugal', tier: 'NORMAL' },
    { name: 'AccessoryPlus Czech', code: 'CUST-014', contactName: 'Petr Novák', city: 'Prague', country: 'Czech Republic', tier: 'SILVER' },
    { name: 'CaseMaster Greece', code: 'CUST-015', contactName: 'Nikolaos Papadopoulos', city: 'Athens', country: 'Greece', tier: 'NORMAL' },
    { name: 'PhoneStyle Romania', code: 'CUST-016', contactName: 'Ion Popescu', city: 'Bucharest', country: 'Romania', tier: 'SILVER' },
    { name: 'GadgetStore Hungary', code: 'CUST-017', contactName: 'László Nagy', city: 'Budapest', country: 'Hungary', tier: 'GOLD' },
    { name: 'CaseCentral Ireland', code: 'CUST-018', contactName: 'Sean O\'Brien', city: 'Dublin', country: 'Ireland', tier: 'NORMAL' },
    { name: 'MobileTrend Finland', code: 'CUST-019', contactName: 'Mikko Virtanen', city: 'Helsinki', country: 'Finland', tier: 'SILVER' },
    { name: 'AccessoryDirect Denmark', code: 'CUST-020', contactName: 'Lars Andersen', city: 'Copenhagen', country: 'Denmark', tier: 'VIP' },
  ];

  const existingCustomers = await prisma.customer.count({ where: { tenantId } });
  let customersCreated = 0;
  const customers: { id: string; name: string; code: string; tier: string }[] = [];

  for (const c of customerTemplates) {
    const exists = await prisma.customer.findUnique({
      where: { code_tenantId: { code: c.code, tenantId } },
    });
    if (exists) {
      customers.push(exists);
      continue;
    }
    const created = await prisma.customer.create({
      data: {
        name: c.name,
        code: c.code,
        contactName: c.contactName,
        email: `order@${c.code.toLowerCase().replace(/-/g, '')}.com`,
        phone: `+49-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000000 + 1000000)}`,
        city: c.city,
        country: c.country,
        tier: c.tier,
        tenantId,
      },
    });
    customers.push(created);
    customersCreated++;
  }
  console.log(`👥 客户: 已有 ${existingCustomers}, 新增 ${customersCreated}, 共 ${customers.length} 个`);

  // ===== 2. 销售订单 (30 条) =====
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const soPrefix = `SO-${dateStr}-`;
  const existingSOCount = await prisma.salesOrder.count({
    where: { tenantId, orderNumber: { startsWith: soPrefix } },
  });
  const startNum = existingSOCount + 1;

  let soCreated = 0;
  const statuses: Array<'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'> = [
    'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING',
    'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING',
    'CONFIRMED', 'CONFIRMED', 'CONFIRMED',
    'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED',
    'CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED',
    'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING',
  ];

  const userId = (await prisma.user.findFirst({ where: { tenantId } }))?.id;

  for (let i = 0; i < 30; i++) {
    const orderNum = `${soPrefix}${String(startNum + i).padStart(4, '0')}`;
    const exists = await prisma.salesOrder.findUnique({
      where: { orderNumber_tenantId: { orderNumber: orderNum, tenantId } },
    });
    if (exists) continue;

    const customer = customers[i % customers.length];
    const status = statuses[i];
    const itemCount = 1 + (i % 3); // 1-3 个 SKU 每单
    const soItems: { skuId: string; quantity: number; unitPrice: number }[] = [];

    // COMPLETED 订单用较小数量，避免库存不足
    const qtyMultiplier = status === 'COMPLETED' ? 1 : 1;
    const qtyBase = status === 'COMPLETED' ? 2 : 5;
    const qtyRange = status === 'COMPLETED' ? 3 : 20;

    let totalAmount = 0;
    for (let j = 0; j < itemCount; j++) {
      const sku = skus[(i + j) % skus.length];
      const wholesale = sku.wholesalePrice ? Number(sku.wholesalePrice) : 5;
      const unitPrice = getUnitPrice(wholesale, customer.tier);
      const qty = qtyBase + ((i + j) % qtyRange) * qtyMultiplier; // 2-5 件 (COMPLETED) 或 5-24 件
      soItems.push({ skuId: sku.id, quantity: qty, unitPrice });
      totalAmount += unitPrice * qty;
    }

    const so = await prisma.salesOrder.create({
      data: {
        orderNumber: orderNum,
        tenantId,
        customerId: customer.id,
        warehouseId: mainWh.id,
        status,
        totalAmount: new Prisma.Decimal(totalAmount),
        currency: 'EUR',
        source: 'MANUAL',
        orderedAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        shippedAt: status === 'COMPLETED' ? new Date(Date.now() - (10 - (i % 5)) * 24 * 60 * 60 * 1000) : null,
      },
    });

    for (const it of soItems) {
      await prisma.salesOrderItem.create({
        data: {
          salesOrderId: so.id,
          skuId: it.skuId,
          quantity: it.quantity,
          unitPrice: new Prisma.Decimal(it.unitPrice),
          pickedQty: status === 'COMPLETED' ? it.quantity : 0,
        },
      });
    }

    // COMPLETED 订单需要扣减库存并写 ledger
    if (status === 'COMPLETED') {
      for (const it of soItems) {
        const inv = await prisma.inventoryItem.findFirst({
          where: {
            tenantId,
            skuId: it.skuId,
            warehouseId: mainWh.id,
          },
        });
        if (inv && inv.quantity >= it.quantity) {
          await prisma.inventoryItem.update({
            where: { id: inv.id },
            data: { quantity: inv.quantity - it.quantity },
          });
          await prisma.inventoryLedger.create({
            data: {
              tenantId,
              skuId: it.skuId,
              warehouseId: mainWh.id,
              type: 'OUTBOUND',
              quantity: -it.quantity,
              referenceType: 'SO',
              referenceId: so.id,
              notes: `Sales order ${so.orderNumber}`,
              operatorId: userId,
            },
          });
        }
      }
    }

    // CONFIRMED 订单需要锁定库存
    if (status === 'CONFIRMED') {
      for (const it of soItems) {
        const items = await prisma.inventoryItem.findMany({
          where: {
            tenantId,
            skuId: it.skuId,
            warehouseId: mainWh.id,
          },
          orderBy: { quantity: 'desc' },
        });
        let remaining = it.quantity;
        for (const inv of items) {
          if (remaining <= 0) break;
          const avail = inv.quantity - inv.lockedQty;
          if (avail <= 0) continue;
          const lockQty = Math.min(remaining, avail);
          await prisma.inventoryItem.update({
            where: { id: inv.id },
            data: { lockedQty: inv.lockedQty + lockQty },
          });
          remaining -= lockQty;
        }
      }
    }

    soCreated++;
  }

  console.log(`📋 销售订单: 新增 ${soCreated} 条 (PENDING/CONFIRMED/COMPLETED/CANCELLED)`);
  console.log(`\n🎉 销售种子数据完成！共 ${customers.length} 客户、${soCreated} 销售订单`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
