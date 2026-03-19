/**
 * 仓库 / 库存 / 条码 示例数据种子
 * Updated: 2026-02-28T11:00:00
 *
 * 业务逻辑说明：
 * - 仓库: 物理仓库 (主仓/备货仓/FBA)
 * - 货位: 仓库内的具体位置 (区-通道-架-位)，有唯一条码
 * - 库存: SKU × 仓库 × 货位 → 数量、锁定数量
 * - 条码类型: 1) SKU条码 2) 货位条码 3) 外箱条码(装箱单)
 *
 * Usage: cd backend && npx tsx prisma/seed-warehouse-inventory.ts
 */

import 'dotenv/config';
import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 仓库 / 库存 / 条码 示例数据种子...\n');

  // 获取租户
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'test-company' } });
  if (!tenant) {
    throw new Error('Tenant test-company not found. Run main seed first.');
  }
  const tenantId = tenant.id;

  // ===== 1. 仓库 (已有3个) =====
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
  });
  if (warehouses.length === 0) {
    throw new Error('No warehouses. Create warehouses first via API.');
  }
  console.log(`📦 仓库: ${warehouses.map((w) => `${w.name}(${w.code})`).join(', ')}`);

  const mainWh = warehouses.find((w) => w.code === 'WH-MAIN') ?? warehouses[0];
  const prepWh = warehouses.find((w) => w.code === 'WH-PREP');
  const fbaWh = warehouses.find((w) => w.code === 'WH-FBA');

  // ===== 2. 货位：确保主仓有结构化货位，并设置 barcode = code =====
  const existingBins = await prisma.binLocation.findMany({
    where: { warehouseId: mainWh.id, tenantId },
    take: 40,
  });

  // 更新货位条码（用 code 作为条码内容）
  let binsUpdated = 0;
  for (const bin of existingBins) {
    if (!bin.barcode || bin.barcode !== bin.code) {
      await prisma.binLocation.update({
        where: { id: bin.id },
        data: { barcode: bin.code },
      });
      binsUpdated++;
    }
  }
  console.log(`📍 货位: 已为 ${binsUpdated} 个货位设置条码 (barcode = code)`);

  const bins = await prisma.binLocation.findMany({
    where: { warehouseId: mainWh.id, tenantId },
    orderBy: { code: 'asc' },
    take: 20,
  });

  // ===== 2b. 为备货仓和 FBA 仓创建库位 =====
  const createBinsForWarehouse = async (wh: { id: string; name: string }, prefix: string, count: number) => {
    let created = 0;
    for (let z = 0; z < 2; z++) {
      for (let a = 1; a <= 3; a++) {
        for (let s = 1; s <= 2; s++) {
          for (let p = 1; p <= 2; p++) {
            if (created >= count) return;
            const code = `${prefix}-${String(z + 1).padStart(2, '0')}-${String(a).padStart(2, '0')}-${String(s).padStart(2, '0')}-${String(p).padStart(2, '0')}`;
            const existing = await prisma.binLocation.findFirst({
              where: { code, tenantId },
            });
            if (!existing) {
              await prisma.binLocation.create({
                data: {
                  code,
                  warehouseId: wh.id,
                  tenantId,
                  zone: `${prefix}${z + 1}`,
                  aisle: String(a).padStart(2, '0'),
                  shelf: String(s).padStart(2, '0'),
                  position: String(p).padStart(2, '0'),
                  barcode: code,
                },
              });
              created++;
            }
          }
        }
      }
    }
  };

  if (prepWh) {
    await createBinsForWarehouse(prepWh, 'PREP', 12);
    const prepBins = await prisma.binLocation.count({ where: { warehouseId: prepWh.id } });
    console.log(`📍 备货仓库位: ${prepBins} 个`);
  }
  if (fbaWh) {
    await createBinsForWarehouse(fbaWh, 'FBA', 12);
    const fbaBins = await prisma.binLocation.count({ where: { warehouseId: fbaWh.id } });
    console.log(`📍 FBA 仓库位: ${fbaBins} 个`);
  }

  // ===== 3. SKU 列表 =====
  const skus = await prisma.sku.findMany({
    where: { tenantId },
    include: { product: true },
    take: 35,
  });
  console.log(`📦 使用 ${skus.length} 个 SKU`);

  // ===== 4. 清理旧库存（可选，避免重复）— 这里不删，只补充/更新 =====
  // 创建 30+ 条「带货位」的库存记录（覆盖不同业务场景）
  const inventoryScenarios: Array<{
    skuIdx: number;
    warehouse: typeof mainWh;
    binCode: string | null;
    qty: number;
    lockedQty: number;
    note: string;
  }> = [];

  // 场景1: 主仓 + 具体货位 (15 条)
  for (let i = 0; i < 15 && i < bins.length; i++) {
    inventoryScenarios.push({
      skuIdx: i % skus.length,
      warehouse: mainWh,
      binCode: bins[i].code,
      qty: 50 + i * 10,
      lockedQty: i % 3 === 0 ? 5 : 0, // 每3个有锁定（模拟预订单）
      note: `主仓货位${bins[i].code}`,
    });
  }

  // 场景2: 主仓 + 无货位（整箱暂存区）(8 条)
  for (let i = 15; i < 23; i++) {
    inventoryScenarios.push({
      skuIdx: i % skus.length,
      warehouse: mainWh,
      binCode: null,
      qty: 100 + (i - 15) * 20,
      lockedQty: i === 18 ? 30 : 0, // 1 条有锁定
      note: '主仓暂存区(未上架)',
    });
  }

  // 场景3: 备货仓 (若有) (6 条)
  if (prepWh) {
    for (let i = 23; i < 29; i++) {
      inventoryScenarios.push({
        skuIdx: i % skus.length,
        warehouse: prepWh,
        binCode: null,
        qty: 40 + (i - 23) * 15,
        lockedQty: 0,
        note: '备货仓',
      });
    }
  }

  // 场景4: FBA 仓 (若有) (4 条)
  if (fbaWh) {
    for (let i = 29; i < 33; i++) {
      inventoryScenarios.push({
        skuIdx: i % skus.length,
        warehouse: fbaWh,
        binCode: null,
        qty: 80,
        lockedQty: i === 30 ? 20 : 0,
        note: 'FBA 备货',
      });
    }
  }

  const userId = (await prisma.user.findFirst({ where: { tenantId } }))?.id;
  let created = 0;
  let ledgerCreated = 0;

  for (const s of inventoryScenarios) {
    const bin = s.binCode ? bins.find((b) => b.code === s.binCode) : null;
    const binId = bin?.id ?? null;

    const existing = await prisma.inventoryItem.findFirst({
      where: {
        tenantId,
        skuId: skus[s.skuIdx].id,
        warehouseId: s.warehouse.id,
        binLocationId: binId,
      },
    });

    if (existing) {
      // 更新数量、锁定，模拟真实分布
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: {
          quantity: s.qty,
          lockedQty: s.lockedQty,
        },
      });
    } else {
      await prisma.inventoryItem.create({
        data: {
          tenantId,
          skuId: skus[s.skuIdx].id,
          warehouseId: s.warehouse.id,
          binLocationId: binId,
          quantity: s.qty,
          lockedQty: s.lockedQty,
        },
      });
      created++;
    }

    // 写入一条 INBOUND 日志（若没有对应记录）
    const ledgerExists = await prisma.inventoryLedger.findFirst({
      where: {
        skuId: skus[s.skuIdx].id,
        warehouseId: s.warehouse.id,
        type: 'INBOUND',
      },
    });
    if (!ledgerExists) {
      await prisma.inventoryLedger.create({
        data: {
          tenantId,
          skuId: skus[s.skuIdx].id,
          warehouseId: s.warehouse.id,
          type: 'INBOUND',
          quantity: s.qty,
          referenceType: 'DEMO_SEED',
          notes: s.note,
          operatorId: userId,
        },
      });
      ledgerCreated++;
    }
  }

  console.log(`📊 库存: 处理 ${inventoryScenarios.length} 条场景, 新增 ${created} 条,  ledger +${ledgerCreated}`);

  // ===== 5. 到柜预报演示数据：多货柜 + 多状态 + 多 SKU 装箱单 =====
  // Updated: 2026-03-19T00:38:28-0400 - 扩展 Shipment 种子，覆盖到柜预报全状态并提升演示真实度
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { tenantId },
    include: { items: { include: { sku: { include: { product: true } } } } },
    orderBy: { createdAt: 'asc' },
  });

  const shipmentSeedTag = '[DEMO_SHIPMENTS_V2_20260319]';
  const activePurchaseOrders = purchaseOrders.filter((po) => po.items.length > 0);
  let packingCount = 0;
  let shipmentCreated = 0;
  let shipmentUpdated = 0;

  if (activePurchaseOrders.length > 0) {
    const statusPlan: ShipmentStatus[] = [
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.ARRIVED,
      ShipmentStatus.ARRIVED_PORT,
      ShipmentStatus.AT_WAREHOUSE_PENDING_UNLOAD,
      ShipmentStatus.UNLOADING_COUNTING_RECEIVING,
    ];
    const vesselNames = [
      'COSCO SHIPPING',
      'EVERGREEN',
      'MAERSK AURORA',
      'CMA CGM HORIZON',
      'OOCL PACIFIC',
      'HAPAG-LLOYD NOVA',
    ];
    const totalDemoShipments = 18;

    for (let i = 0; i < totalDemoShipments; i++) {
      const po = activePurchaseOrders[i % activePurchaseOrders.length];
      const status = statusPlan[i % statusPlan.length];
      const etaOffsetDaysByStatus: Record<ShipmentStatus, number> = {
        [ShipmentStatus.PENDING]: 18,
        [ShipmentStatus.LOADING]: 14,
        [ShipmentStatus.LOADED]: 12,
        [ShipmentStatus.IN_TRANSIT]: 7,
        [ShipmentStatus.ARRIVED]: -1,
        [ShipmentStatus.ARRIVED_PORT]: 1,
        [ShipmentStatus.AT_WAREHOUSE_PENDING_UNLOAD]: 2,
        [ShipmentStatus.UNLOADING_COUNTING_RECEIVING]: 3,
        [ShipmentStatus.RECEIVING]: 5,
        [ShipmentStatus.DELIVERED]: 8,
        [ShipmentStatus.COMPLETED]: 10,
      };
      const etaOffsetDays = etaOffsetDaysByStatus[status] ?? 7;
      const now = new Date();
      const eta = new Date(now);
      eta.setDate(now.getDate() + etaOffsetDays);
      const etd = new Date(eta);
      etd.setDate(eta.getDate() - (18 + (i % 6)));

      // 使用高位数编号，尽量降低与真实业务箱号冲突概率。
      const containerNo = `MSKU9${String(100000 + i).padStart(6, '0')}`;
      const vesselName = vesselNames[i % vesselNames.length];
      const existingShip = await prisma.shipment.findFirst({
        where: { tenantId, containerNo },
      });

      const shipmentData = {
        purchaseOrderId: po.id,
        tenantId,
        containerNo,
        vesselName,
        status,
        etd,
        eta,
        portOfLoading: 'Shenzhen (CNSZX)',
        portOfDischarge: 'Dublin (IEDUB)',
        notes: `${shipmentSeedTag} demo-index=${i + 1}`,
      };

      const ship = existingShip
        ? await prisma.shipment.update({
            where: { id: existingShip.id },
            data: shipmentData,
          })
        : await prisma.shipment.create({
            data: shipmentData,
          });

      if (existingShip) shipmentUpdated++;
      else shipmentCreated++;

      // 先清空该货柜旧装箱单，保证可重复执行且不会累计垃圾数据。
      await prisma.packingListItem.deleteMany({ where: { shipmentId: ship.id } });

      const cartonsPerShipment = 12 + (i % 10); // 12~21 箱/柜
      for (let c = 1; c <= cartonsPerShipment; c++) {
        const item = po.items[(c - 1) % po.items.length];
        const cartonNo = `CTN-${String(i + 1).padStart(3, '0')}-${String(c).padStart(3, '0')}`;
        const barcode = `PL-${cartonNo}-${item.sku.code}`;
        await prisma.packingListItem.create({
          data: {
            shipmentId: ship.id,
            cartonNo,
            skuCode: item.sku.code,
            skuName: item.sku.product?.name ?? item.sku.code,
            quantity: 12 + ((c + i) % 9) * 6, // 12~60，制造“每柜货很多且杂”
            barcode,
          },
        });
        packingCount++;
      }
    }
  } else {
    console.log('⚠️ 未找到包含采购明细的采购单，跳过 Shipment 演示数据生成。');
  }

  console.log(
    `📦 到柜预报: 货柜新增 ${shipmentCreated} / 更新 ${shipmentUpdated}，装箱单 ${packingCount} 条 (外箱条码格式: PL-CTN-XXX-XXX-SKU)`,
  );

  // ===== 6. 输出说明文档 =====
  const docPath = 'docs/warehouse-inventory-barcode-demo.md';
  const docContent = `# 仓库 / 库存 / 条码 业务逻辑说明与示例数据

> 本文档对应 seed-warehouse-inventory.ts 生成的示例数据，便于理解业务逻辑。

## 一、核心概念

### 1. 仓库 (Warehouse)
- **定义**: 物理仓库，如主仓、备货仓、FBA 备货中心
- **字段**: 名称、编码、地址、是否默认

### 2. 货位 (BinLocation)
- **定义**: 仓库内的具体存放位置，采用「区-通道-架-位」结构
- **编码示例**: \`A-01-01-01\` = A区 / 01通道 / 01架 / 01位
- **条码**: 每个货位有唯一条码，用于 PDA 扫码上架、拣货

### 3. 库存 (InventoryItem)
- **维度**: SKU × 仓库 × 货位（货位可为空 = 暂存区）
- **数量**: \`quantity\` 总数量，\`lockedQty\` 锁定数量
- **可用数量**: \`quantity - lockedQty\`（锁定通常对应预订单）

### 4. 条码类型
| 类型 | 用途 | 数据来源 | 打印场景 |
|------|------|----------|----------|
| SKU 条码 | 商品识别 | Sku.code / Sku.barcode | 商品标签 |
| 货位条码 | 位置识别 | BinLocation.code | 货位永久标签 |
| 外箱条码 | 收货/装箱 | PackingListItem (箱号+SKU) | 外箱标签 |

---

## 二、示例数据 (共 ${inventoryScenarios.length + packingCount}+ 条)

### 1. 仓库

| 编码 | 名称 | 说明 |
|------|------|------|
| WH-MAIN | 主仓库 | 深圳南山区，默认仓 |
| WH-PREP | 备货仓 | 深圳宝安区 |
| WH-FBA | FBA 备货中心 | 东莞虎门 |

### 2. 货位 (主仓部分)

| 编码 | 区 | 通道 | 架 | 位 | 条码 |
|------|-----|------|-----|-----|------|
| A-01-01-01 | A | 01 | 01 | 01 | A-01-01-01 |
| A-01-01-02 | A | 01 | 01 | 02 | A-01-01-02 |
| ... | ... | ... | ... | ... | ... |

### 3. 库存场景 (${inventoryScenarios.length} 条)

| 场景 | SKU | 仓库 | 货位 | 数量 | 锁定 | 说明 |
|------|-----|------|------|------|------|------|
| 1-15 | 手机壳/配件 | 主仓 | 具体货位 | 50-200 | 部分5 | 已上架，可拣货 |
| 16-23 | 手机壳/配件 | 主仓 | 无 | 100-240 | 1条30 | 暂存区，未上架 |
| 24-29 | 配件 | 备货仓 | 无 | 40-115 | 0 | 备货仓库存 |
| 30-33 | 配件 | FBA | 无 | 80 | 1条20 | 发往 FBA 的备货 |

### 4. 装箱单 / 外箱条码 (${packingCount} 条)

| 箱号 | SKU | 数量 | 外箱条码 |
|------|-----|------|----------|
| CTN-001 | (根据PO) | 20-40 | PL-CTN-001-SKUCODE |
| CTN-002 | ... | ... | PL-CTN-002-SKUCODE |
| ... | ... | ... | ... |

**收货流程**: 扫外箱条码 → 系统识别箱号+SKU → 核对数量 → 录入收货 → 生成入库任务

---

## 三、业务流程串联

1. **采购到货**: PO → Shipment → PackingList（外箱条码）→ 收货
2. **入库**: 扫商品条码 + 扫货位条码 → 绑定到 InventoryItem
3. **拣货**: 拣货单按货位排序 → 到货位扫货位条码 → 扫商品条码确认
4. **条码打印**: SKU 标签 / 货位标签 / 外箱标签 → 热敏打印机

---

*生成时间: ${new Date().toISOString()}*
`;

  const fs = await import('fs');
  const path = await import('path');
  const dir = path.join(process.cwd(), '..', 'docs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'warehouse-inventory-barcode-demo.md'), docContent);
  console.log(`\n📄 说明文档: ${path.join(dir, 'warehouse-inventory-barcode-demo.md')}`);

  const totalInventory = await prisma.inventoryItem.count({ where: { tenantId } });
  const totalLedger = await prisma.inventoryLedger.count({ where: { tenantId } });
  const totalPacking = await prisma.packingListItem.count();

  console.log('\n✅ 完成!');
  console.log(`   - 库存记录: ${totalInventory}`);
  console.log(`   - 操作日志: ${totalLedger}`);
  console.log(`   - 装箱单(外箱条码): ${totalPacking}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
