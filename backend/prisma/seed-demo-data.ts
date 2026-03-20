// Updated: 2026-03-20T12:35:00 - 全模块 demo 数据种子，确保每个角色进入每个页面都不为空
import 'dotenv/config';
import {
  CashbookSessionStatus,
  CashbookTransactionType,
  InvoiceStatus,
  OrderSource,
  PaymentMethod,
  PickWaveStatus,
  Prisma,
  PrismaClient,
  ReturnCondition,
  ReturnDisposition,
  ReturnStatus,
  ShiftHandoverStatus,
  SOStatus,
  UserRole,
} from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 全模块 demo 数据种子...\n');

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'test-company' } });
  if (!tenant) throw new Error('Tenant test-company not found. Run main seed first.');
  const tenantId = tenant.id;

  const users = await prisma.user.findMany({ where: { tenantId, isActive: true } });
  if (users.length === 0) throw new Error('No users found. Run seed:demo-users first.');

  const findUser = (role: UserRole) => users.find((u) => u.role === role) ?? users[0];
  const adminUser = findUser(UserRole.ADMIN);
  const opsUser = findUser(UserRole.OPERATIONS);
  const warehouseUser = findUser(UserRole.WAREHOUSE);
  const pickerUser = findUser(UserRole.PICKER);
  const salesUser = findUser(UserRole.SALES);
  const returnSpecialist = findUser(UserRole.RETURN_SPECIALIST);
  const financeUser = findUser(UserRole.FINANCE);
  const salesSupervisor = findUser(UserRole.SALES_SUPERVISOR);

  const warehouses = await prisma.warehouse.findMany({ where: { tenantId }, take: 3 });
  if (warehouses.length === 0) throw new Error('No warehouses. Run seed-warehouse-inventory first.');
  const mainWh = warehouses[0];

  const skus = await prisma.sku.findMany({
    where: { tenantId },
    include: { product: true },
    take: 30,
  });
  if (skus.length === 0) throw new Error('No SKUs. Run main seed first.');

  const customers = await prisma.customer.findMany({ where: { tenantId }, take: 20 });
  if (customers.length === 0) throw new Error('No customers. Run seed-sales first.');

  const completedOrders = await prisma.salesOrder.findMany({
    where: { tenantId, status: SOStatus.COMPLETED },
    include: { items: true },
    take: 10,
  });

  const confirmedOrders = await prisma.salesOrder.findMany({
    where: { tenantId, status: SOStatus.CONFIRMED },
    include: { items: true },
    take: 6,
  });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // ================================================================
  // 1. 更新 demo 用户 lastLoginAt — 让员工出勤页有数据
  // ================================================================
  console.log('👤 更新 demo 用户 lastLoginAt（模拟今日打卡）...');
  const loginTimes = [8, 8.25, 8.5, 9, 9.25, 7.75, 8.75, 9.5];
  for (let i = 0; i < users.length; i++) {
    const loginHour = loginTimes[i % loginTimes.length];
    const loginAt = new Date(todayStart);
    loginAt.setHours(Math.floor(loginHour), Math.round((loginHour % 1) * 60), 0, 0);
    await prisma.user.update({
      where: { id: users[i].id },
      data: { lastLoginAt: loginAt },
    });
  }
  console.log(`   ✅ ${users.length} 个用户的 lastLoginAt 已更新为今日\n`);

  // ================================================================
  // 2. 交接班记录 (ShiftHandover) — 让员工管理/班次有数据
  // ================================================================
  console.log('🔄 创建交接班记录...');
  const existingShifts = await prisma.shiftHandover.count({
    where: { tenantId, shiftStart: { gte: todayStart } },
  });
  if (existingShifts === 0) {
    const shiftUsers = [opsUser, warehouseUser, salesUser, pickerUser];
    for (let i = 0; i < shiftUsers.length; i++) {
      const shiftStart = new Date(todayStart);
      shiftStart.setHours(8 + (i % 2), i * 15, 0, 0);
      const shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(shiftStart.getHours() + 8);
      await prisma.shiftHandover.create({
        data: {
          tenantId,
          operatorId: shiftUsers[i].id,
          shiftStart,
          shiftEnd,
          totalOrders: 15 + i * 5,
          expectedCash: new Prisma.Decimal(800 + i * 200),
          actualCash: new Prisma.Decimal(800 + i * 200 - (i === 1 ? 15 : 0)),
          variance: new Prisma.Decimal(i === 1 ? -15 : 0),
          varianceReason: i === 1 ? '找零差额，已记录' : null,
          evidencePhotos: [],
          status: ShiftHandoverStatus.COMPLETED,
        },
      });
    }
    console.log(`   ✅ ${shiftUsers.length} 条今日交接班记录\n`);
  } else {
    console.log(`   ⏭️ 已有 ${existingShifts} 条今日交接班，跳过\n`);
  }

  // ================================================================
  // 3. 波次拣货 (PickWave + PickWaveItem) — 让仓库/拣货员有数据
  // ================================================================
  console.log('📦 创建波次拣货记录...');
  const existingWaves = await prisma.pickWave.count({
    where: { tenantId, startedAt: { gte: todayStart } },
  });
  if (existingWaves < 3 && confirmedOrders.length > 0) {
    const waveStatuses: PickWaveStatus[] = [
      PickWaveStatus.COMPLETED,
      PickWaveStatus.IN_PROGRESS,
      PickWaveStatus.PENDING,
      PickWaveStatus.COMPLETED,
    ];
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const batchSize = Math.max(1, Math.floor(confirmedOrders.length / waveStatuses.length));
    const waveOffset = existingWaves;

    for (let w = 0; w < waveStatuses.length; w++) {
      const waveNum = `WV-${dateStr}-${String(waveOffset + w + 1).padStart(3, '0')}`;
      const existing = await prisma.pickWave.findFirst({ where: { tenantId, waveNumber: waveNum } });
      if (existing) continue;
      const status = waveStatuses[w];
      const ordersInWave = confirmedOrders.slice(w * batchSize, (w + 1) * batchSize);
      if (ordersInWave.length === 0) continue;

      const startedAt = new Date(todayStart);
      startedAt.setHours(9 + w, w * 20, 0, 0);
      const completedAt = status === PickWaveStatus.COMPLETED
        ? new Date(startedAt.getTime() + 45 * 60 * 1000)
        : null;

      const wave = await prisma.pickWave.create({
        data: {
          tenantId,
          waveNumber: waveNum,
          warehouseId: mainWh.id,
          status,
          totalOrders: ordersInWave.length,
          assigneeId: w % 2 === 0 ? pickerUser.id : warehouseUser.id,
          startedAt,
          completedAt,
        },
      });

      for (const order of ordersInWave) {
        for (const item of order.items) {
          const bins = await prisma.binLocation.findMany({
            where: { tenantId, warehouseId: mainWh.id },
            take: 1,
          });
          await prisma.pickWaveItem.create({
            data: {
              pickWaveId: wave.id,
              salesOrderId: order.id,
              skuId: item.skuId,
              binLocationId: bins[0]?.id ?? null,
              requiredQty: item.quantity,
              pickedQty: status === PickWaveStatus.COMPLETED ? item.quantity : 0,
            },
          });
        }
      }
    }
    console.log(`   ✅ ${waveStatuses.length} 个波次（含 COMPLETED/IN_PROGRESS/PENDING）\n`);
  } else {
    console.log(`   ⏭️ 已有 ${existingWaves} 个今日波次，跳过\n`);
  }

  // ================================================================
  // 4. 退货记录 (ReturnRecord) — 让退货专员有数据
  // ================================================================
  console.log('🔙 创建退货记录...');
  const existingReturns = await prisma.returnRecord.count({ where: { tenantId } });
  if (existingReturns < 5) {
    const returnTemplates: Array<{
      status: ReturnStatus;
      condition: ReturnCondition;
      disposition: ReturnDisposition;
      issue: string;
      notes: string;
    }> = [
      { status: ReturnStatus.RECEIVED, condition: ReturnCondition.UNKNOWN, disposition: ReturnDisposition.PENDING, issue: '客户声称收到错误型号', notes: '待匹配订单' },
      { status: ReturnStatus.RECEIVED, condition: ReturnCondition.DAMAGED, disposition: ReturnDisposition.PENDING, issue: '外包装破损，内物有划痕', notes: '需拍照记录' },
      { status: ReturnStatus.MATCHED, condition: ReturnCondition.GOOD, disposition: ReturnDisposition.PENDING, issue: '客户不想要了，产品完好', notes: '已匹配订单，待决策' },
      { status: ReturnStatus.MATCHED, condition: ReturnCondition.NEW_LIKE, disposition: ReturnDisposition.PENDING, issue: '发错颜色，产品未使用', notes: '可直接零售' },
      { status: ReturnStatus.DECIDED, condition: ReturnCondition.BROKEN, disposition: ReturnDisposition.DISCARD, issue: '屏幕保护膜碎裂', notes: '无修复价值，弃货' },
      { status: ReturnStatus.DECIDED, condition: ReturnCondition.DAMAGED, disposition: ReturnDisposition.REPAIR, issue: '充电线接口松动', notes: '送修后可继续销售' },
      { status: ReturnStatus.DECIDED, condition: ReturnCondition.GOOD, disposition: ReturnDisposition.DISCOUNT_SALE, issue: '包装破损但产品完好', notes: '降价 30% 销售' },
      { status: ReturnStatus.PROCESSED, condition: ReturnCondition.NEW_LIKE, disposition: ReturnDisposition.RETAIL, issue: '颜色不喜欢，产品全新', notes: '已重新上架零售' },
      { status: ReturnStatus.PROCESSED, condition: ReturnCondition.DAMAGED, disposition: ReturnDisposition.DISCARD, issue: '手机壳严重变形', notes: '已报废处理' },
      { status: ReturnStatus.RECEIVED, condition: ReturnCondition.UNKNOWN, disposition: ReturnDisposition.PENDING, issue: '批量退回5件，需逐件检查', notes: '等待退货专员处理' },
    ];

    for (let i = 0; i < returnTemplates.length; i++) {
      const t = returnTemplates[i];
      const order = completedOrders[i % Math.max(1, completedOrders.length)];
      const sku = skus[i % skus.length];
      const createdAt = new Date(now.getTime() - (returnTemplates.length - i) * 24 * 60 * 60 * 1000);
      await prisma.returnRecord.create({
        data: {
          tenantId,
          sourceOrderId: order?.id ?? null,
          sourceOrderNumber: order?.orderNumber ?? null,
          skuId: sku.id,
          returnedQty: 1 + (i % 3),
          status: t.status,
          condition: t.condition,
          disposition: t.disposition,
          issueDescription: t.issue,
          intakeNotes: t.notes,
          receivedByUserId: returnSpecialist.id,
          decidedByUserId: t.status === ReturnStatus.DECIDED || t.status === ReturnStatus.PROCESSED ? returnSpecialist.id : null,
          decidedAt: t.status === ReturnStatus.DECIDED || t.status === ReturnStatus.PROCESSED ? createdAt : null,
          processedAt: t.status === ReturnStatus.PROCESSED ? createdAt : null,
          createdAt,
        },
      });
    }
    console.log(`   ✅ ${returnTemplates.length} 条退货记录（各状态全覆盖）\n`);
  } else {
    console.log(`   ⏭️ 已有 ${existingReturns} 条退货记录，跳过\n`);
  }

  // ================================================================
  // 5. 发票 (Invoice) — 让现金与对账有未付数据
  // ================================================================
  console.log('🧾 创建发票...');
  const existingInvoices = await prisma.invoice.count({ where: { tenantId } });
  if (existingInvoices === 0) {
    const invoiceStatuses: InvoiceStatus[] = [
      InvoiceStatus.UNPAID,
      InvoiceStatus.UNPAID,
      InvoiceStatus.UNPAID,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
      InvoiceStatus.OVERDUE,
      InvoiceStatus.PAID,
      InvoiceStatus.PAID,
      InvoiceStatus.PAID,
      InvoiceStatus.UNPAID,
      InvoiceStatus.PARTIALLY_PAID,
    ];
    for (let i = 0; i < invoiceStatuses.length; i++) {
      const customer = customers[i % customers.length];
      const status = invoiceStatuses[i];
      const amount = 200 + i * 150;
      const paidAmount = status === InvoiceStatus.PAID
        ? amount
        : status === InvoiceStatus.PARTIALLY_PAID
          ? Math.round(amount * 0.4)
          : 0;
      const dueDate = new Date(now);
      dueDate.setDate(now.getDate() + (status === InvoiceStatus.OVERDUE ? -15 : 30 - i * 3));
      const issuedAt = new Date(now.getTime() - (30 - i * 2) * 24 * 60 * 60 * 1000);
      const order = completedOrders[i % Math.max(1, completedOrders.length)];

      await prisma.invoice.create({
        data: {
          invoiceNo: `INV-${now.toISOString().slice(0, 7).replace('-', '')}-${String(i + 1).padStart(4, '0')}`,
          tenantId,
          customerId: customer.id,
          orderId: order?.id ?? null,
          amount: new Prisma.Decimal(amount),
          paidAmount: new Prisma.Decimal(paidAmount),
          status,
          dueDate,
          issuedAt,
          paidAt: status === InvoiceStatus.PAID ? issuedAt : null,
        },
      });
    }
    console.log(`   ✅ ${invoiceStatuses.length} 条发票（含未付/部分付/逾期/已付）\n`);
  } else {
    console.log(`   ⏭️ 已有 ${existingInvoices} 条发票，跳过\n`);
  }

  // ================================================================
  // 6. 收款记录 (PaymentRecord) — 让今日对账有收款数据
  // ================================================================
  console.log('💰 创建收款记录...');
  const existingPayments = await prisma.paymentRecord.count({
    where: { tenantId, receivedAt: { gte: todayStart } },
  });
  if (existingPayments === 0) {
    const paymentMethods: PaymentMethod[] = [
      PaymentMethod.CASH,
      PaymentMethod.CASH,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.CASH,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.CASH,
    ];
    for (let i = 0; i < paymentMethods.length; i++) {
      const customer = customers[i % customers.length];
      const receivedAt = new Date(todayStart);
      receivedAt.setHours(9 + i, i * 8, 0, 0);
      await prisma.paymentRecord.create({
        data: {
          tenantId,
          customerId: customer.id,
          amount: new Prisma.Decimal(100 + i * 75),
          method: paymentMethods[i],
          reference: paymentMethods[i] === PaymentMethod.BANK_TRANSFER ? `TRF-${i + 1}` : null,
          notes: `Demo payment #${i + 1}`,
          receivedBy: (financeUser ?? salesSupervisor ?? adminUser).id,
          receivedAt,
        },
      });
    }
    console.log(`   ✅ ${paymentMethods.length} 条今日收款记录（CASH/DEBIT/CREDIT/TRANSFER）\n`);
  } else {
    console.log(`   ⏭️ 已有 ${existingPayments} 条今日收款，跳过\n`);
  }

  // ================================================================
  // 7. 现金柜 + 流水 (CashbookSession + CashbookTransaction)
  // ================================================================
  console.log('🏦 创建现金柜与流水...');
  const existingSessions = await prisma.cashbookSession.count({
    where: { tenantId, openedAt: { gte: todayStart } },
  });
  if (existingSessions === 0) {
    const openedAt = new Date(todayStart);
    openedAt.setHours(8, 30, 0, 0);
    const closedAt = new Date(todayStart);
    closedAt.setHours(17, 0, 0, 0);
    const session = await prisma.cashbookSession.create({
      data: {
        tenantId,
        operatorId: (salesSupervisor ?? opsUser).id,
        openedAt,
        closedAt,
        openingCash: new Prisma.Decimal(200),
        closingCash: new Prisma.Decimal(1450),
        status: CashbookSessionStatus.CLOSED,
      },
    });
    const txData: Array<{ type: CashbookTransactionType; amount: number; desc: string; hourOffset: number }> = [
      { type: CashbookTransactionType.IN, amount: 350, desc: 'CaseCentral Ireland 现金收款', hourOffset: 1 },
      { type: CashbookTransactionType.IN, amount: 280, desc: 'Tech Retail GmbH 现金收款', hourOffset: 2 },
      { type: CashbookTransactionType.OUT, amount: 50, desc: '购买打印纸', hourOffset: 3 },
      { type: CashbookTransactionType.IN, amount: 420, desc: 'GadgetZone UK 现金收款', hourOffset: 4 },
      { type: CashbookTransactionType.OUT, amount: 30, desc: '快递费用', hourOffset: 5 },
      { type: CashbookTransactionType.IN, amount: 180, desc: 'SmartCase Italia 现金收款', hourOffset: 6 },
      { type: CashbookTransactionType.IN, amount: 100, desc: 'AccessoryHub Spain 现金收款', hourOffset: 7 },
    ];
    for (const tx of txData) {
      const createdAt = new Date(openedAt);
      createdAt.setHours(openedAt.getHours() + tx.hourOffset);
      await prisma.cashbookTransaction.create({
        data: {
          tenantId,
          sessionId: session.id,
          type: tx.type,
          amount: new Prisma.Decimal(tx.amount),
          description: tx.desc,
          createdAt,
        },
      });
    }
    console.log(`   ✅ 1 个现金柜班次 + ${txData.length} 条流水\n`);
  } else {
    console.log(`   ⏭️ 已有 ${existingSessions} 个今日现金柜，跳过\n`);
  }

  // ================================================================
  // 8. 通知 (NotificationEvent) — 让通知页有数据
  // ================================================================
  console.log('🔔 创建通知事件...');
  const existingNotifs = await prisma.notificationEvent.count({ where: { tenantId } });
  if (existingNotifs < 5) {
    const notifications: Array<{
      type: string;
      title: string;
      body: string;
      targetUserId: string;
      hoursAgo: number;
    }> = [
      { type: 'OUTBOUND_COMPLETED', title: '订单 SO-20260320-0001 已出库', body: '销售订单已完成出库，请安排物流。', targetUserId: opsUser.id, hoursAgo: 2 },
      { type: 'OUTBOUND_COMPLETED', title: '订单 SO-20260320-0003 已出库', body: '销售订单已完成出库。', targetUserId: opsUser.id, hoursAgo: 4 },
      { type: 'LOW_STOCK', title: 'iPhone 16 Pro Max 透明硅胶壳 库存偏低', body: '当前库存低于安全库存阈值，请及时补货。', targetUserId: warehouseUser.id, hoursAgo: 6 },
      { type: 'ORDER_CREATED', title: '新订单 SO-20260320-0005 待确认', body: '来自 Tech Retail GmbH 的批发订单，金额 €1,250.00。', targetUserId: salesUser.id, hoursAgo: 1 },
      { type: 'WAVE_CREATED', title: '波次 WV-20260320-001 已生成', body: '包含 3 个订单，请安排拣货。', targetUserId: pickerUser.id, hoursAgo: 3 },
      { type: 'RETURN_RECEIVED', title: '退回件已登记（3件）', body: '来自 CaseCentral Ireland 的退货已登记入库。', targetUserId: returnSpecialist.id, hoursAgo: 5 },
      { type: 'CREDIT_WARNING', title: 'Mobile Accessories EU 信用额度即将用尽', body: '当前可用额度 €520.00，已使用 92%。', targetUserId: adminUser.id, hoursAgo: 8 },
      { type: 'SHIFT_VARIANCE', title: '交接班差异 -€15.00', body: '运营班次存在 €15 差异，已记录原因。', targetUserId: adminUser.id, hoursAgo: 10 },
    ];
    for (const n of notifications) {
      const createdAt = new Date(now.getTime() - n.hoursAgo * 60 * 60 * 1000);
      await prisma.notificationEvent.create({
        data: {
          tenantId,
          type: n.type,
          title: n.title,
          body: n.body,
          targetUserId: n.targetUserId,
          createdAt,
        },
      });
    }
    console.log(`   ✅ ${notifications.length} 条通知事件\n`);
  } else {
    console.log(`   ⏭️ 已有 ${existingNotifs} 条通知，跳过\n`);
  }

  // ================================================================
  // 9. 更新客户欠款余额 — 让信用额度和对账有数据
  // ================================================================
  console.log('💳 更新客户信用额度和欠款...');
  const customersToUpdate = customers.slice(0, 12);
  for (let i = 0; i < customersToUpdate.length; i++) {
    const c = customersToUpdate[i];
    const creditLimit = 2000 + i * 500;
    const outstanding = Math.min(creditLimit * 0.3 + i * 100, creditLimit);
    await prisma.customer.update({
      where: { id: c.id },
      data: {
        creditLimit: new Prisma.Decimal(creditLimit),
        outstandingBalance: new Prisma.Decimal(outstanding),
        creditFrozen: outstanding >= creditLimit,
      },
    });
  }
  console.log(`   ✅ ${customersToUpdate.length} 个客户的信用额度 / 欠款已更新\n`);

  // ================================================================
  // 10. 补批发站来源订单 — 让今日订单不为 0
  // ================================================================
  console.log('🛒 补充今日订单...');
  const todayOrders = await prisma.salesOrder.count({
    where: { tenantId, createdAt: { gte: todayStart }, status: { not: SOStatus.CANCELLED } },
  });
  if (todayOrders === 0) {
    const sources: OrderSource[] = [
      OrderSource.WHOLESALE_SITE,
      OrderSource.WHOLESALE_SITE,
      OrderSource.SALES_REP,
      OrderSource.MANUAL,
      OrderSource.WHOLESALE_SITE,
      OrderSource.REORDER_MERGED,
    ];
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const existingCount = await prisma.salesOrder.count({
      where: { tenantId, orderNumber: { startsWith: `SO-${dateStr}-` } },
    });
    for (let i = 0; i < sources.length; i++) {
      const orderNum = `SO-${dateStr}-${String(existingCount + i + 1).padStart(4, '0')}`;
      const customer = customers[i % customers.length];
      const itemCount = 1 + (i % 3);
      let totalAmount = 0;
      const items: Array<{ skuId: string; quantity: number; unitPrice: number }> = [];
      for (let j = 0; j < itemCount; j++) {
        const sku = skus[(i * 3 + j) % skus.length];
        const unitPrice = Number(sku.wholesalePrice ?? 5);
        const qty = 3 + (j * 2);
        items.push({ skuId: sku.id, quantity: qty, unitPrice });
        totalAmount += unitPrice * qty;
      }
      const createdAt = new Date(todayStart);
      createdAt.setHours(8 + i, i * 10, 0, 0);
      const so = await prisma.salesOrder.create({
        data: {
          orderNumber: orderNum,
          tenantId,
          customerId: customer.id,
          warehouseId: mainWh.id,
          status: i < 3 ? SOStatus.PENDING : SOStatus.CONFIRMED,
          totalAmount: new Prisma.Decimal(totalAmount),
          currency: 'EUR',
          source: sources[i],
          createdAt,
        },
      });
      for (const item of items) {
        await prisma.salesOrderItem.create({
          data: {
            salesOrderId: so.id,
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
          },
        });
      }
    }
    console.log(`   ✅ ${sources.length} 条今日订单\n`);
  } else {
    console.log(`   ⏭️ 已有 ${todayOrders} 条今日订单，跳过\n`);
  }

  // ================================================================
  // 汇总
  // ================================================================
  const counts = {
    users: await prisma.user.count({ where: { tenantId } }),
    customers: await prisma.customer.count({ where: { tenantId } }),
    salesOrders: await prisma.salesOrder.count({ where: { tenantId } }),
    pickWaves: await prisma.pickWave.count({ where: { tenantId } }),
    returnRecords: await prisma.returnRecord.count({ where: { tenantId } }),
    invoices: await prisma.invoice.count({ where: { tenantId } }),
    paymentRecords: await prisma.paymentRecord.count({ where: { tenantId } }),
    cashbookSessions: await prisma.cashbookSession.count({ where: { tenantId } }),
    notifications: await prisma.notificationEvent.count({ where: { tenantId } }),
    shifts: await prisma.shiftHandover.count({ where: { tenantId } }),
  };

  console.log('🎉 全模块 demo 数据种子完成！');
  console.log('   汇总：');
  for (const [key, value] of Object.entries(counts)) {
    console.log(`   - ${key}: ${value}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
