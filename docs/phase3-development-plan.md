# Phase 3 开发计划：销售 & 客户 & 批发生意闭环

> 版本: v1.0 | 日期: 2026-02-28  
> 目标: 实现 M7 销售订单管理、M8 客户管理，打通批发业务流程

---

## 一、表结构设计 (Prisma Schema)

### 1.1 客户 (Customer)

```prisma
model Customer {
  id          String       @id @default(uuid())
  name        String       // 公司名称
  code        String       // 客户编码，如 CUST-001
  tenantId    String       @map("tenant_id")
  contactName String?      @map("contact_name")
  email       String?
  phone       String?
  address     String?
  city        String?
  country     String?
  tier        CustomerTier @default(NORMAL)  // 客户分级，影响批发价
  isActive    Boolean      @default(true) @map("is_active")
  notes       String?
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  salesOrders   SalesOrder[]
  @@unique([code, tenantId])
  @@index([tenantId])
  @@map("customers")
}

enum CustomerTier {
  NORMAL   // 标准价 = Sku.wholesalePrice * 1.0
  SILVER   // 银牌   = Sku.wholesalePrice * 0.98
  GOLD     // 金牌   = Sku.wholesalePrice * 0.95
  VIP      // VIP    = Sku.wholesalePrice * 0.90
}
```

### 1.2 销售订单 (SalesOrder) & 明细 (SalesOrderItem)

```prisma
model SalesOrder {
  id           String        @id @default(uuid())
  orderNumber  String        @map("order_number")  // SO-20260228-0001
  tenantId     String        @map("tenant_id")
  customerId   String        @map("customer_id")
  warehouseId  String        @map("warehouse_id")  // 发货仓库
  status       SOStatus      @default(PENDING)
  totalAmount  Decimal?      @map("total_amount") @db.Decimal(12, 2)
  currency     String        @default("EUR")
  notes        String?
  source       OrderSource   @default(MANUAL)      // MANUAL | SHOPIFY
  externalId   String?       @map("external_id")  // Shopify Order ID
  orderedAt    DateTime?    @map("ordered_at")
  shippedAt    DateTime?    @map("shipped_at")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  tenant    Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer  Customer         @relation(fields: [customerId], references: [id])
  warehouse Warehouse        @relation(fields: [warehouseId], references: [id])
  items     SalesOrderItem[]
  @@unique([orderNumber, tenantId])
  @@index([tenantId])
  @@index([customerId])
  @@index([warehouseId])
  @@map("sales_orders")
}

model SalesOrderItem {
  id            String   @id @default(uuid())
  salesOrderId  String   @map("sales_order_id")
  skuId         String   @map("sku_id")
  quantity      Int
  unitPrice     Decimal  @map("unit_price") @db.Decimal(10, 2)
  pickedQty     Int      @default(0) @map("picked_qty")
  createdAt     DateTime @default(now()) @map("created_at")

  salesOrder SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Cascade)
  sku        Sku        @relation(fields: [skuId], references: [id])
  @@index([salesOrderId])
  @@index([skuId])
  @@map("sales_order_items")
}

enum SOStatus {
  PENDING       // 待确认
  CONFIRMED     // 已确认（库存已锁定）
  PICKING       // 拣货中
  PACKED        // 已打包
  SHIPPED       // 已发货
  COMPLETED     // 已完成
  CANCELLED     // 已取消
}

enum OrderSource {
  MANUAL
  SHOPIFY
}
```

### 1.3 现有 Model 扩展

| Model | 新增关联 |
|-------|----------|
| Tenant | `customers Customer[]` / `salesOrders SalesOrder[]` |
| Sku | `soItems SalesOrderItem[]` |
| Warehouse | `salesOrders SalesOrder[]` |

---

## 二、API 设计

### 2.1 客户模块 `/api/customers`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /customers | 创建客户 |
| GET | /customers?search=&page=&limit= | 分页列表，支持搜索 |
| GET | /customers/:id | 客户详情（含订单统计） |
| PATCH | /customers/:id | 更新客户 |
| DELETE | /customers/:id | 软删除 |

### 2.2 销售订单模块 `/api/sales-orders`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /sales-orders | 创建 SO（选客户、选 SKU、自动带批发价/tier 价） |
| GET | /sales-orders?status=&customerId=&page=&limit= | 分页列表 |
| GET | /sales-orders/:id | 详情（含 items、customer、warehouse） |
| PATCH | /sales-orders/:id | 更新（状态、备注等） |
| POST | /sales-orders/:id/confirm | 确认订单 → 锁定库存 |
| POST | /sales-orders/:id/cancel | 取消 → 解锁库存 |
| GET | /sales-orders/:id/pick-list | 生成拣货单（按货位排序的 SKU 清单） |
| POST | /sales-orders/:id/fulfill | 出库确认 → 扣库存、写 ledger、更新状态 |

### 2.3 批发价逻辑（服务层）

```text
getUnitPrice(skuId, customerTier):
  1. 取 Sku.wholesalePrice
  2. 根据 tier 应用折扣: NORMAL=1.0, SILVER=0.98, GOLD=0.95, VIP=0.90
  3. 返回 unitPrice
```

---

## 三、页面顺序与实现步骤

### Step 1：数据库 & 客户后端（优先）

| 序号 | 任务 | 产出 |
|------|------|------|
| 1.1 | 新增 Customer、SalesOrder、SalesOrderItem 等 model | `prisma/schema.prisma` |
| 1.2 | 执行 migrate | `prisma migrate dev --name phase3_customer_sales` |
| 1.3 | 创建 customers 模块（CRUD） | `customers/` |
| 1.4 | 注册到 `app.module` | — |

### Step 2：客户前端

| 序号 | 任务 | 产出 |
|------|------|------|
| 2.1 | 客户管理页面 | `/dashboard/customers` |
| 2.2 | 侧边栏增加「客户」入口 | `layout.tsx` |
| 2.3 | 仪表盘增加客户数、待处理订单数 | `dashboard/page.tsx` |

### Step 3：销售订单后端

| 序号 | 任务 | 产出 |
|------|------|------|
| 3.1 | 创建 sales-orders 模块 | `sales-orders/` |
| 3.2 | 实现 create、findAll、findOne、update | — |
| 3.3 | 实现 confirm（锁定库存）、cancel（解锁） | — |
| 3.4 | 实现 getPickList（按货位排序） | — |
| 3.5 | 实现 fulfill（出库、扣库存、写 ledger） | — |
| 3.6 | 创建 SO 时按客户 tier 自动计算 unitPrice | — |

### Step 4：销售订单前端

| 序号 | 任务 | 产出 |
|------|------|------|
| 4.1 | 销售订单列表页 | `/dashboard/sales-orders` |
| 4.2 | 创建 SO 对话框（选客户、选 SKU、数量、自动带价） | — |
| 4.3 | SO 详情 Sheet（状态、明细、操作按钮） | — |
| 4.4 | 拣货单视图（可打印） | — |
| 4.5 | 确认/取消/出库确认等操作 | — |

### Step 5：库存与 SO 联动

| 序号 | 任务 | 说明 |
|------|------|------|
| 5.1 | confirm 时调用 lockInventory | 按 SO 明细锁定对应 SKU×仓库 |
| 5.2 | cancel 时调用 unlockInventory | 释放锁定 |
| 5.3 | fulfill 时按 SO 明细调用 outbound | 扣减库存，ledger 的 referenceType=SO |

### Step 6：报表与打磨（可选，Phase 4 再做）

- 销售报表（按客户/SKU/时间）
- 出库单/送货单 PDF
- 仪表盘「待处理订单」卡片

---

## 四、拣货单数据结构

`GET /sales-orders/:id/pick-list` 返回示例：

```json
{
  "salesOrderId": "xxx",
  "orderNumber": "SO-20260228-0001",
  "warehouseName": "主仓库",
  "items": [
    { "binCode": "A-01-01-01", "skuCode": "AP-CASE-BLK", "skuName": "iPhone 16 壳", "quantity": 10 },
    { "binCode": "A-01-01-02", "skuCode": "ESR-FILM-CLR", "skuName": "保护膜", "quantity": 20 }
  ]
}
```

逻辑：从 `InventoryItem` 按 `(skuId, warehouseId)` 查有库存的货位，按 `binLocation.code` 排序，合并同 SKU 多货位数量。

---

## 五、依赖关系

```text
Customer 模块 ──┬──> SalesOrder（选客户）
                └──> 批发价计算（按 tier）

Inventory 模块 ──┬──> confirm: lockInventory
                 ├──> cancel: unlockInventory
                 └──> fulfill: outbound

Warehouse 模块 ──> SalesOrder（发货仓库）
Sku 模块 ───────> SalesOrderItem（SKU、wholesalePrice）
```

---

## 六、预估工时

| 阶段 | 内容 | 预估 |
|------|------|------|
| Step 1 | Schema + 客户后端 | 0.5d |
| Step 2 | 客户前端 | 0.5d |
| Step 3 | 销售订单后端 | 1d |
| Step 4 | 销售订单前端 | 1d |
| Step 5 | 库存联动 | 0.5d |
| **合计** | | **3.5d** |

---

## 七、后续扩展（Phase 4 / Shopify）

- Shopify Webhook 创建 SO（source=SHOPIFY, externalId=shopify_order_id）
- 发货后回写 Shopify 物流状态
- 客户管理中的 Shopify 客户同步
- 分级定价表（覆盖 Sku.wholesalePrice 的客户/品级特价）
