# B2B 全链路数字化业务操作系统 — 产品需求说明文档 (PRD)

> **版本**: v1.0  
> **文档日期**: 2026-03-16  
> **项目代号**: StockMate Pro  
> **定位**: 取代原 Mobigo 平台，打造私有化资产级业务操作系统  
> **目标市场**: 爱尔兰及周边欧洲地区手机配件批发市场  
> **核心口号**: "防漏洞、省人手、看住钱"

---

## 目录

1. [产品总体蓝图](#1-产品总体蓝图)
2. [A 端：零售商专属采购台](#2-a-端零售商专属采购台)
3. [B 端：内勤与生意控制台](#3-b-端内勤与生意控制台)
4. [B 端：深度 WMS 仓储作业系统](#4-b-端深度-wms-仓储作业系统)
5. [C 端：老板移动决策中心](#5-c-端老板移动决策中心)
6. [数据模型与核心实体](#6-数据模型与核心实体)
7. [核心业务流程](#7-核心业务流程)
8. [非功能性需求](#8-非功能性需求)
9. [优先级与里程碑](#9-优先级与里程碑)
10. [术语表](#10-术语表)

---

## 1. 产品总体蓝图

### 1.1 业务背景

公司从深圳进口手机配件至爱尔兰，历经 10 年发展，目前每月进口 2–6 个集装箱，服务约 3000 家零售商。现有 Mobigo.ie 平台功能陈旧，零售商仍依赖电话、微信沟通下单，效率低下，且存在以下核心痛点：

| 痛点 | 影响 | 期望 |
|------|------|------|
| 依赖口头/图片描述产品，无标准化展示 | 客户理解偏差、比价后流失 | 自助浏览、即看即买 |
| 无信用管控，欠款依赖人工记忆 | 坏账风险、账目不清 | 系统化信用额度管理 |
| 发货靠人工记忆，无扫码校验 | 错发、漏发导致跨国退换货成本高昂 | 扫码出库防错 |
| 老板脱离门店后无法实时掌控经营状况 | 决策滞后、失控 | 移动端全天候看板与审批 |
| 员工交接班无对账机制 | 现金短缺难追责 | 强制交接对账 |

### 1.2 系统三端架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    B2B 全链路数字化业务操作系统                      │
├──────────────────┬──────────────────┬────────────────────────────┤
│  A 端            │  B 端            │  C 端                      │
│  零售商专属采购台  │  内勤与仓储控制台  │  老板移动决策中心             │
│                  │                  │                            │
│ • 极简采购大盘    │ • 操作员班次风控  │ • 每日经营简报               │
│ • 专属数字展厅    │ • 订单/客户管家   │ • 动销红黑榜                │
│ • 一键再下单     │ • 深度 WMS       │ • 移动特批权限               │
│ • 快速批量单     │ • 财务风控       │ • 核心经营看板               │
│ • 抢特价/清仓    │ • 审计日志       │                            │
│ • 订期货/预售    │                  │                            │
└──────────────────┴──────────────────┴────────────────────────────┘
```

### 1.3 产品目标（可量化）

| # | 目标项 | 量化指标 | 衡量周期 |
|---|--------|---------|---------|
| G1 | 零售商自助下单占比 | ≥ 80% 订单通过系统下单（非电话/微信） | 上线后 3 个月 |
| G2 | 降低发货错误率 | 错发/漏发率 < 0.1%（当前约 2–5%） | 上线后 1 个月 |
| G3 | 信用风控覆盖率 | 100% 客户有信用额度设置 | 上线时 |
| G4 | 交接班对账合规 | 100% 班次完成强制对账 | 上线时 |
| G5 | 老板移动审批响应 | 特批申请 ≤ 5 分钟内收到推送 | 上线后 |
| G6 | 拣货效率提升 | 波次拣货效率提升 ≥ 100%（对比逐单拣货） | 上线后 1 个月 |

---

## 2. A 端：零售商专属采购台

> **设计原则**: 放弃传统电商花哨展示，采用"快餐式"极简引导，降低爱尔兰当地手机店老板的下单时间成本。

### 2.1 极简采购大盘（首页门户）

#### 2.1.1 核心看板（顶部常驻区）

| 看板项 | 数据来源 | 展示规则 | 更新频率 |
|--------|---------|---------|---------|
| 当前可用信用额度 | `Customer.creditLimit - Customer.outstandingBalance` | 格式：`€XX,XXX.XX` 可用 / `€XX,XXX.XX` 总额度；低于 20% 时红色告警 | 实时 |
| 本月待结欠款总额 | 当月所有 `Invoice` 中 `status=UNPAID` 的合计 | 格式：`€XX,XXX.XX`；超期未付标红 | 实时 |
| 最近订单物流状态 | 最新一笔 `SalesOrder` 的 `status` + 物流信息 | 状态标签（待确认/拣货中/已发货/已签收）+ 预计到达时间 | 实时 |

#### 2.1.2 四大核心快捷入口

**入口 1：再来一单**

| 属性 | 说明 |
|------|------|
| 功能描述 | 一键调出上月（或上次）采购清单，修改数量后直接拉起结算 |
| 数据来源 | 取最近一笔 `SalesOrder` 的 `items`，或按客户历史高频 SKU 自动聚合 |
| 交互流程 | 点击 → 弹出清单面板 → 勾选/取消 SKU → 修改数量 → 确认加入购物车 → 结算 |
| 验收标准 | 1. 能正确加载上次订单明细；2. 修改数量后金额实时更新；3. 缺货 SKU 灰显并提示 |
| 边界情况 | 无历史订单时显示"暂无历史订单，请先浏览商品" |

**入口 2：快速批量单**

| 属性 | 说明 |
|------|------|
| 功能描述 | 类似 Excel 的矩阵表格录入，支持 SKU 编码/条码 + 数量快速录入 |
| 交互流程 | 打开矩阵表格 → 输入 SKU 编码或扫码 → 自动补全商品名 → Tab 键到数量列 → 输入数量 → 回车换行继续录入 → 底部汇总金额 → 提交 |
| 性能要求 | 几十款产品 30 秒内录完，输入几百个 SKU 时无卡顿 |
| 验收标准 | 1. SKU 编码输入后 200ms 内自动补全商品名称与当前价格；2. 支持条码扫描枪输入；3. 无效 SKU 即时红字提示；4. 支持批量粘贴（从 Excel 复制多行 SKU+数量） |
| 辅助功能 | 支持上传 CSV/Excel 文件批量导入 |

**入口 3：抢特价/清仓**

| 属性 | 说明 |
|------|------|
| 功能描述 | 直达高利润或急需去库存的专区 |
| 数据来源 | 后台标记的 `Product.tag` 含 `CLEARANCE` 或 `SPECIAL_OFFER` 的商品 |
| 展示规则 | 显示原价与特价、折扣比例、剩余库存数、限时倒计时（若有） |
| 验收标准 | 1. 仅展示后台配置的特价/清仓商品；2. 库存为 0 时自动下架；3. 特价过期后自动恢复原价 |

**入口 4：订期货/预售**

| 属性 | 说明 |
|------|------|
| 功能描述 | 展示即将到港货柜中的热门商品，支持支付定金提前锁定货权 |
| 数据来源 | `Shipment.status = IN_TRANSIT` 关联的商品，且标记为 `allowPreorder = true` |
| 交互流程 | 浏览预售商品 → 选择数量 → 支付定金（按比例） → 系统锁定货权 → 到货后通知补尾款/直接发货 |
| 验收标准 | 1. 展示船期 ETA；2. 定金比例可后台配置（默认 30%）；3. 到货后自动生成补款提醒；4. 超售保护：预售总量不超过预报到货量 |
| 边界情况 | 到货延迟时，系统自动更新预计到达时间并通知客户 |

#### 2.1.3 跨端草稿箱同步

| 属性 | 说明 |
|------|------|
| 功能描述 | 客户在电脑端录入一半的采购单，未结算关闭网页后，手机端登录可继续 |
| 技术方案 | 购物车数据存储在服务端（关联 `customerId`），非 localStorage |
| 同步策略 | 每次加购/修改数量后实时同步到服务端；登录后自动拉取最新购物车状态 |
| 验收标准 | 1. PC 端加购后，手机端刷新可见；2. 多设备同时操作时以最后修改时间为准（Last-Write-Wins） |

### 2.2 专属数字展厅

#### 2.2.1 智能分级定价

| 属性 | 说明 |
|------|------|
| 功能描述 | 系统根据客户等级或独立合同自动显示对应底价 |
| 定价层级 | 1. **合同专属价**（`CustomerPrice` 表）> 2. **等级折扣**（`CustomerTier`）> 3. **标准批发价**（`Sku.wholesalePrice`） |
| 客户等级与折扣 | NORMAL: 100% / SILVER: 98% / GOLD: 95% / VIP: 90% |
| 合同专属价 | 可对特定客户设置特定 SKU 的固定价格，优先级最高 |
| 前端展示 | 客户登录后只看到一个最终价格，不展示折扣计算过程 |
| 验收标准 | 1. 不同等级客户登录后看到的价格不同且正确；2. 合同专属价覆盖等级折扣；3. 未登录不显示任何价格 |

#### 2.2.2 多单位自动换算

| 属性 | 说明 |
|------|------|
| 功能描述 | 购买商品时可在下拉菜单切换计量单位（根/箱/打等），系统自动换算 |
| 数据结构 | `SkuUnit` 表：`{ skuId, unitName, conversionFactor, isBaseUnit }` |
| 示例 | Type-C 充电线：基本单位 = "根"，1 箱 = 100 根，1 打 = 12 根 |
| 价格换算 | 切换单位后价格自动乘以 `conversionFactor`；阶梯折扣按换算后的基本数量计算 |
| 库存联动 | 库存始终以基本单位存储和扣减 |
| 验收标准 | 1. 切换单位后价格和数量实时更新；2. 库存判断基于换算后的基本单位数；3. 订单明细中同时记录实际单位和基本单位数量 |

#### 2.2.3 最小起订量 (MOQ)

| 属性 | 说明 |
|------|------|
| 功能描述 | 不满设定金额或箱数无法提交订单 |
| 规则类型 | 1. **SKU 级 MOQ**：单个 SKU 的最低购买数量（如：最少买 10 根）；2. **整单 MOQ**：订单总金额不低于设定值（如：最低 €100） |
| 前端提示 | 不满足 MOQ 时：加购按钮不可点击 + 红字提示所需最低数量或金额 |
| 验收标准 | 1. 低于 SKU 级 MOQ 无法加入购物车；2. 低于整单 MOQ 无法提交订单；3. 提示信息明确告知差额 |

### 2.3 页面与路由结构（A 端）

| 路由 | 组件 | 登录要求 | 说明 |
|------|------|---------|------|
| `/` | `BuyerDashboard` | 是 | 极简采购大盘首页，含看板 + 四大快捷入口 |
| `/quick-reorder` | `QuickReorder` | 是 | 再来一单 |
| `/bulk-order` | `BulkOrderMatrix` | 是 | 快速批量单矩阵表格 |
| `/deals` | `SpecialDeals` | 是 | 特价/清仓专区 |
| `/preorder` | `PreorderList` | 是 | 预售/期货专区 |
| `/products` | `ProductCatalog` | 否（无价格） | 商品目录浏览 |
| `/products/:id` | `ProductDetail` | 否（无价格） | 商品详情 |
| `/categories/:id` | `CategoryProducts` | 否（无价格） | 类目商品列表 |
| `/cart` | `ShoppingCart` | 是 | 购物车 |
| `/orders` | `OrderList` | 是 | 我的订单列表 |
| `/orders/:id` | `OrderDetail` | 是 | 订单详情 |
| `/account` | `AccountInfo` | 是 | 账户信息、信用额度、对账单 |
| `/login` | `Login` | 否 | 登录 |
| `/register` | `Register` | 否 | 注册 |

---

## 3. B 端：内勤与生意控制台

> **设计原则**: 责任到人，账目清晰，应对各种突发业务状况。

### 3.1 操作员与班次风控

#### 3.1.1 账号权限矩阵

| 角色 | 可执行操作 | 不可执行操作 | 特殊限制 |
|------|-----------|-------------|---------|
| **SUPER_ADMIN** | 所有操作 | — | — |
| **ADMIN** | 用户管理、全局配置 | 删除审计日志 | — |
| **SALES（销售）** | 代客下单、查看客户、查看订单、查看报价 | 修改底价、删除订单、修改信用额度 | 仅可操作分配给自己的客户 |
| **FINANCE（财务）** | 设置信用额度、查看/生成对账单、收款登记 | 修改订单商品、仓库操作 | 额度变更超过 €5,000 需老板审批 |
| **WAREHOUSE（库管）** | 收货、上架、拣货、出库、盘点 | 查看价格、修改订单 | — |
| **VIEWER（只读）** | 查看所有数据 | 任何写操作 | — |

#### 3.1.2 审计日志

| 属性 | 说明 |
|------|------|
| 触发条件 | 以下操作自动生成不可篡改的审计日志：修改客户底价、修改信用额度、删除/取消订单、手工调整库存、修改客户等级、登录/登出 |
| 日志字段 | `timestamp`, `operatorId`, `operatorName`, `action`, `targetType`, `targetId`, `beforeValue`, `afterValue`, `ipAddress` |
| 不可篡改 | 日志表仅支持 INSERT，不支持 UPDATE/DELETE；物理删除需 SUPER_ADMIN + 二次确认 |
| 查询能力 | 支持按时间范围、操作人、操作类型、目标 ID 筛选 |

#### 3.1.3 交接班强制对账

| 属性 | 说明 |
|------|------|
| 功能描述 | 员工点击"交班"时，系统弹窗强制核对当班期间的经营数据 |
| 对账内容 | 1. 当班总单量（笔）；2. 应收现金总额（€）；3. 实收现金总额（员工手工输入）；4. 产生欠款总额（€）；5. 差异金额 = 应收 - 实收 |
| 差异处理 | 差异 = 0 → 正常交班；差异 ≠ 0 → 强制填写差异原因 + 拍照凭证上传 → 生成差异报告通知老板 |
| 数据结构 | `ShiftHandover`: `{ id, operatorId, shiftStart, shiftEnd, totalOrders, expectedCash, actualCash, variance, varianceReason, evidencePhotos[], status }` |
| 验收标准 | 1. 未完成对账不可退出系统；2. 对账记录不可修改（仅追加备注）；3. 差异超过 €50 自动推送老板手机 |

### 3.2 订单与客户管家

#### 3.2.1 代客下单与补单

| 属性 | 说明 |
|------|------|
| 功能描述 | 销售人员接到客户微信/电话要货，可在后台替客户开单 |
| 交互流程 | 选择客户 → 搜索并添加 SKU → 输入数量 → 系统自动带入该客户的等级价格 → 确认下单 → 自动扣减信用额度 |
| 标记 | 订单来源标记为 `source = 'SALES_REP'`，记录操作人 ID |
| 验收标准 | 1. 代客下单与客户自助下单走相同的库存锁定和信用检查逻辑；2. 客户登录后可在"我的订单"中看到此订单 |

#### 3.2.2 智能拆单与欠货记录

| 属性 | 说明 |
|------|------|
| 功能描述 | 订单中某 SKU 库存不足时，一键拆分为"可发货"和"欠货"两部分 |
| 拆单规则 | 客户订购 N 个，库存仅有 M 个 (M < N)：生成 M 个的发货单 + (N-M) 个转入欠货池 |
| 欠货池 | `BackorderItem`: `{ id, originalOrderId, skuId, backorderQty, status, fulfilledQty, linkedShipmentId }` |
| 到货预警 | 欠货池中的 SKU 对应的 `Shipment` 到货（状态变为 ARRIVED）时，自动推送提醒给相关销售员 |
| 验收标准 | 1. 拆单后原订单标记为"部分发货"状态；2. 欠货记录可在后台独立查看和管理；3. 到货后自动匹配欠货池并提醒 |

#### 3.2.3 信用额度锁单（熔断机制）

| 属性 | 说明 |
|------|------|
| 功能描述 | 财务为客户设定最高欠款上限，超额后前端熔断下单 |
| 数据字段 | `Customer`: 新增 `creditLimit`（额度上限）、`outstandingBalance`（当前欠款余额）、`creditFrozen`（是否冻结） |
| 熔断触发 | `outstandingBalance >= creditLimit` 时自动设置 `creditFrozen = true` |
| 前端表现 | 冻结后：1. A 端首页红色告警横幅"您的信用额度已用尽，请联系财务"；2. 下单按钮灰显不可点击；3. 购物车中显示"信用额度不足" |
| 恢复条件 | 1. 客户付款 → 财务登记收款 → `outstandingBalance` 减少 → 自动解冻；2. 老板手机端特批临时增额 |
| 验收标准 | 1. 熔断后客户无法下单（前端 + 后端双重校验）；2. 付款登记后自动解冻（无需人工干预）；3. 临时增额有时效限制（可配置，默认 7 天后恢复） |

#### 3.2.4 一键 PDF 对账单

| 属性 | 说明 |
|------|------|
| 功能描述 | 每月初一键生成客户专属对账单 |
| 对账单内容 | 客户基本信息、账期区间、购买明细（日期/订单号/SKU/数量/金额）、已付金额汇总、未付金额汇总、期末余额 |
| 导出格式 | PDF（A4 纵向，含公司 Logo 和抬头）；支持导出为图片（便于微信发送） |
| 发送方式 | 1. 一键发送至客户注册邮箱；2. 后台下载 PDF；3. 生成可分享链接（有效期 7 天） |
| 验收标准 | 1. 对账单金额与系统实际数据一致；2. PDF 排版清晰、适合打印；3. 支持选择月份范围 |

### 3.3 页面与路由结构（B 端后台）

| 路由 | 组件 | 所需角色 | 说明 |
|------|------|---------|------|
| `/admin/dashboard` | `AdminDashboard` | ALL | 后台首页仪表盘 |
| `/admin/orders` | `OrderManagement` | SALES, ADMIN | 订单管理 |
| `/admin/orders/create` | `CreateOrderForCustomer` | SALES, ADMIN | 代客下单 |
| `/admin/orders/:id` | `OrderDetail` | SALES, ADMIN | 订单详情与拆单操作 |
| `/admin/customers` | `CustomerManagement` | SALES, FINANCE, ADMIN | 客户管理 |
| `/admin/customers/:id` | `CustomerDetail` | SALES, FINANCE, ADMIN | 客户详情与信用管理 |
| `/admin/customers/:id/statement` | `CustomerStatement` | FINANCE, ADMIN | 生成对账单 |
| `/admin/backorders` | `BackorderPool` | SALES, WAREHOUSE, ADMIN | 欠货池管理 |
| `/admin/pricing` | `PricingManagement` | ADMIN | 定价策略管理 |
| `/admin/shifts` | `ShiftManagement` | ADMIN | 班次与交接记录 |
| `/admin/shift/handover` | `ShiftHandover` | ALL | 交接班对账 |
| `/admin/audit-log` | `AuditLog` | ADMIN, SUPER_ADMIN | 审计日志 |
| `/admin/users` | `UserManagement` | ADMIN, SUPER_ADMIN | 用户与角色管理 |
| `/admin/settings` | `SystemSettings` | ADMIN, SUPER_ADMIN | 系统配置 |

---

## 4. B 端：深度 WMS 仓储作业系统

> **设计原则**: 摆脱人工记忆，扫码作业，彻底解决错发、漏发带来的高昂跨国退换货成本。

### 4.1 供应链上游追踪

#### 4.1.1 即将到柜预报

| 属性 | 说明 |
|------|------|
| 功能描述 | 登记从国内发往爱尔兰的集装箱柜号与船期，系统提前预留库位 |
| 数据结构 | 复用并扩展现有 `Shipment` 模型，新增字段：`containerNo`（柜号）、`vesselName`（船名）、`etd`（预计开船日）、`eta`（预计到港日）、`actualArrival`（实际到港日）、`preorderEnabled`（是否开放预售） |
| 联动功能 | 1. 标记 `preorderEnabled = true` 后，A 端"预售专区"自动展示对应商品；2. 系统根据 PackingList 预估到货 SKU 量，预留库位空间 |
| 状态流转 | PLANNED → LOADING → IN_TRANSIT → ARRIVED → RECEIVING → COMPLETED |
| 验收标准 | 1. 可录入柜号、船期、关联采购单；2. ETA 倒计时在后台和 C 端看板可见；3. 延误时支持更新 ETA 并自动通知 |

#### 4.1.2 卸柜盲收与质检

| 属性 | 说明 |
|------|------|
| 功能描述 | 货柜到仓后，员工使用 PDA 或手机扫码盲收，系统自动比对采购单 |
| "盲收"含义 | 仓库人员不先看采购单，直接扫码录入实际到货数量，系统自动与 PO 比对，显示差异 |
| 比对逻辑 | 对每个 SKU：`差异 = 实收数量 - PO 应收数量`；差异分类：短少 / 多收 / 外箱破损 / 错发 |
| 质检记录 | `ReceivingInspection`: `{ id, receiptId, skuId, expectedQty, actualQty, damagedQty, discrepancyType, photos[], notes }` |
| 索赔联动 | 差异记录可一键生成索赔单（关联物流公司或厂家），含照片证据 |
| 验收标准 | 1. PDA 扫码后自动识别 SKU 并显示 PO 应收量；2. 差异项红字高亮；3. 破损可拍照上传；4. 收货完成后自动更新 PO 状态和库存 |

### 4.2 库内流转与盘点

#### 4.2.1 动态库位图

| 属性 | 说明 |
|------|------|
| 功能描述 | 精确定位商品到某排某层某位，可视化展示仓库布局 |
| 库位编码规则 | `区-通道-架-层-位`，如 `A-01-03-02`（A 区 1 号通道 3 号架 2 层） |
| 可视化 | 后台展示仓库平面图，每个库位显示：已用/空闲状态、存放的主要 SKU、占用比例颜色编码（绿→黄→红） |
| 与拣货联动 | 拣货单生成时，按库位物理位置排序，规划最短路径 |
| 验收标准 | 1. 支持库位的 CRUD 管理；2. 搜索 SKU 可快速定位所在库位；3. 空库位自动推荐上架位置 |

#### 4.2.2 动销循环盘点

| 属性 | 说明 |
|------|------|
| 功能描述 | 支持不停工盘点，系统每天自动生成盘点任务 |
| 自动抽取规则 | 1. 高频流动 SKU（近 7 天出库量 Top 20%）每周至少盘点 1 次；2. 高价值 SKU 每周至少盘点 1 次；3. 全部 SKU 确保每月至少覆盖一遍 |
| 盘点流程 | 系统生成盘点任务 → 库管员扫码核对 → 录入实际数量 → 系统计算差异 → 差异审批 → 调整库存 |
| 数据结构 | `StockCountTask`: `{ id, warehouseId, assigneeId, status, items[{ skuId, binLocationId, systemQty, actualQty, variance }], createdAt, completedAt }` |
| 验收标准 | 1. 自动生成盘点任务并分配给库管员；2. 盘点差异超过阈值（可配置，默认 5%）自动告警；3. 盘点历史可追溯 |

#### 4.2.3 智能库存预警

| 属性 | 说明 |
|------|------|
| 功能描述 | 根据历史销量自动测算安全库存，低于警戒线生成采购建议 |
| 算法 | 安全库存 = 过去 30 天日均销量 × 补货提前期天数 × 安全系数（默认 1.5） |
| 预警级别 | 🟢 充足（> 安全库存 × 2）/ 🟡 正常（安全库存 ~ 安全库存 × 2）/ 🟠 偏低（< 安全库存）/ 🔴 紧急（< 安全库存 × 0.5 或为 0） |
| 采购建议 | 当库存 ≤ 安全库存时，自动生成建议采购清单：`{ skuId, currentStock, safetyStock, suggestedQty, avgDailySales }` |
| 验收标准 | 1. 预警看板在后台首页和 C 端可见；2. 采购建议一键可转为采购单草稿；3. 安全系数和提前期天数可按 SKU 自定义 |

### 4.3 高效波次出库

#### 4.3.1 波次拣货 (Wave Picking)

| 属性 | 说明 |
|------|------|
| 功能描述 | 将多个小客户订单合并为一个波次，库管员按最优路径一次性拣完 |
| 波次生成规则 | 1. 按时间窗口（如每 2 小时一个波次）或订单数量（如每 10 单一个波次）；2. 可手动选择订单创建波次 |
| 路径优化 | 按库位编码排序（相邻库位优先），减少走动距离 |
| 波次拣货单内容 | `{ waveId, totalOrders, items[{ binCode, skuCode, skuName, totalQty, orderBreakdown[{ orderId, qty }] }] }` |
| 拣货流程 | 生成波次 → 打印波次拣货单 → 库管员按路径拣货 → 分拣台按订单拆分装箱 → 扫码校验 → 出库 |
| 验收标准 | 1. 波次拣货单按库位排序，相同 SKU 合并数量；2. 拣货效率比逐单拣货提升 ≥ 100%；3. 支持拣货进度实时更新 |

#### 4.3.2 出库防错校验

| 属性 | 说明 |
|------|------|
| 功能描述 | 打包发货前，必须用扫码枪扫描条码校验，扫错立刻报警 |
| 校验流程 | 打包员扫描订单条码 → 系统显示该订单应发 SKU 列表 → 逐一扫描 SKU 条码 → 匹配则绿色 ✓ → 不匹配则红色 ✗ 并发出声音告警 → 全部扫完且无错误 → 确认出库 |
| 报警类型 | 1. **扫错SKU**: 该 SKU 不在此订单中；2. **数量超出**: 该 SKU 已扫满，多扫了；3. **遗漏**: 确认出库时仍有未扫描的 SKU |
| 验收标准 | 1. 扫错任何一件立刻声音 + 屏幕告警；2. 未全部扫描完成无法确认出库；3. 校验日志完整记录（时间、操作人、订单号、扫码序列） |

### 4.4 WMS 页面与路由结构

| 路由 | 组件 | 所需角色 | 说明 |
|------|------|---------|------|
| `/admin/wms/dashboard` | `WmsDashboard` | WAREHOUSE, ADMIN | WMS 仪表盘 |
| `/admin/wms/shipments` | `ShipmentTracking` | WAREHOUSE, ADMIN | 到柜预报与追踪 |
| `/admin/wms/shipments/:id` | `ShipmentDetail` | WAREHOUSE, ADMIN | 柜子详情 |
| `/admin/wms/receiving` | `ReceivingStation` | WAREHOUSE | 收货/盲收工作台 |
| `/admin/wms/receiving/:id` | `ReceivingDetail` | WAREHOUSE | 收货明细与质检 |
| `/admin/wms/bin-locations` | `BinLocationMap` | WAREHOUSE, ADMIN | 库位图管理 |
| `/admin/wms/inventory` | `InventoryOverview` | WAREHOUSE, ADMIN | 库存总览与预警 |
| `/admin/wms/stock-count` | `StockCountTasks` | WAREHOUSE | 盘点任务管理 |
| `/admin/wms/stock-count/:id` | `StockCountDetail` | WAREHOUSE | 盘点明细录入 |
| `/admin/wms/waves` | `WaveManagement` | WAREHOUSE | 波次管理 |
| `/admin/wms/waves/:id` | `WavePickList` | WAREHOUSE | 波次拣货单 |
| `/admin/wms/packing` | `PackingStation` | WAREHOUSE | 打包校验工作台 |

---

## 5. C 端：老板移动决策中心

> **设计原则**: 老板不在店里，生意也完全在掌控之中。全天候手机端优先设计。

### 5.1 核心经营看板

#### 5.1.1 每日经营简报

| 属性 | 说明 |
|------|------|
| 功能描述 | 每日定时推送经营简报至老板手机 |
| 推送时间 | 每日 20:00（可自定义）推送当日简报；每周一 09:00 推送周报 |
| 简报内容 | 大字显示以下核心指标（一屏可见）：|

| 指标 | 数据来源 | 展示格式 |
|------|---------|---------|
| 当日总营收 | 今日所有已确认订单的 `totalAmount` 合计 | `€XX,XXX` + 同比昨日涨跌百分比 |
| 实收现金流 | 今日所有 `PaymentRecord.method = CASH` 的合计 | `€XX,XXX` |
| 新增欠款 | 今日所有赊账订单的 `totalAmount` 合计 | `€XX,XXX` + 总欠款余额 |
| 毛利估算 | `(营收 - 成本) / 营收 × 100%`，成本取 `Sku.costPrice` | `XX.X%` |
| 订单量 | 今日新增订单笔数 | `XX 笔` |
| 新客户数 | 今日新注册客户数 | `X 位` |

#### 5.1.2 动销红黑榜

| 属性 | 说明 |
|------|------|
| 功能描述 | 实时显示热销品与滞销品 |
| 红榜（热销） | 今日/本周销量 Top 5 SKU，显示：商品名、销量、销售额、同比增幅 |
| 黑榜（滞销） | 库存滞留超过 90 天且近 30 天零销量的 SKU Top 5，显示：商品名、库存数量、入库天数、占压资金 |
| 验收标准 | 1. 数据实时更新；2. 点击商品可查看详情；3. 滞销品可一键标记为清仓 |

### 5.2 移动特批权限

#### 5.2.1 价格与额度放行

| 属性 | 说明 |
|------|------|
| 功能描述 | 员工提交需要老板审批的申请，老板手机弹窗审批 |
| 审批类型 | 1. **突破底价审批**：订单中某 SKU 需低于最低限价销售；2. **临时增加信用额度**：核心客户需临时提高额度；3. **大额订单审批**：订单金额超过设定阈值（可配置，如 €5,000） |
| 交互流程 | 员工在后台提交审批申请 → 系统推送至老板手机 → 老板查看申请详情（客户信息、金额、理由）→ 一键"同意"或"驳回"（可附备注）→ 结果实时同步回后台 |
| 数据结构 | `ApprovalRequest`: `{ id, type, requesterId, requesterName, customerId, customerName, currentValue, requestedValue, reason, status, approvedBy, approvedAt, expiresAt, notes }` |
| 时效性 | 临时增额默认有效期 7 天（可配置），到期自动恢复原额度 |
| 验收标准 | 1. 申请提交后 ≤ 5 秒推送到老板手机；2. 审批后 ≤ 3 秒同步到后台；3. 支持审批历史查询 |

### 5.3 C 端技术方案

| 属性 | 说明 |
|------|------|
| 终端形态 | 移动端 Web App（PWA），优先适配 iOS Safari 和 Android Chrome |
| 推送方案 | Web Push Notification + 备用 WhatsApp/邮件通知 |
| 离线能力 | 看板数据本地缓存，断网时显示最后同步时间和缓存数据 |
| 安全措施 | 1. 登录需独立 PIN 码或生物识别；2. 会话超时 15 分钟自动锁屏；3. 审批操作需二次确认 |

### 5.4 C 端页面结构

| 路由 | 组件 | 说明 |
|------|------|------|
| `/boss` | `BossDashboard` | 经营看板首页 |
| `/boss/daily-report` | `DailyReport` | 每日经营简报详情 |
| `/boss/rankings` | `SalesRankings` | 动销红黑榜 |
| `/boss/approvals` | `ApprovalList` | 待审批列表 |
| `/boss/approvals/:id` | `ApprovalDetail` | 审批详情与操作 |
| `/boss/finance` | `FinanceOverview` | 财务概览（应收、已收、欠款） |
| `/boss/inventory-alerts` | `InventoryAlerts` | 库存预警 |

---

## 6. 数据模型与核心实体

### 6.1 新增/扩展数据模型总览

> 基于现有 StockMate 系统的 Prisma Schema 进行扩展

#### 6.1.1 客户模型扩展

```prisma
model Customer {
  // ... 现有字段保留 ...

  // === 新增：信用管控 ===
  creditLimit        Decimal?  @map("credit_limit") @db.Decimal(12, 2)
  outstandingBalance Decimal   @default(0) @map("outstanding_balance") @db.Decimal(12, 2)
  creditFrozen       Boolean   @default(false) @map("credit_frozen")
  paymentTermDays    Int       @default(30) @map("payment_term_days")

  // === 新增：关联 ===
  customerPrices  CustomerPrice[]
  paymentRecords  PaymentRecord[]
  invoices        Invoice[]
}
```

#### 6.1.2 新增模型

```prisma
// 客户专属价格
model CustomerPrice {
  id          String   @id @default(uuid())
  customerId  String   @map("customer_id")
  skuId       String   @map("sku_id")
  price       Decimal  @db.Decimal(10, 2)
  validFrom   DateTime @map("valid_from")
  validTo     DateTime? @map("valid_to")
  tenantId    String   @map("tenant_id")

  customer Customer @relation(fields: [customerId], references: [id])
  sku      Sku      @relation(fields: [skuId], references: [id])
  @@unique([customerId, skuId, tenantId])
  @@map("customer_prices")
}

// SKU 多单位换算
model SkuUnit {
  id               String  @id @default(uuid())
  skuId            String  @map("sku_id")
  unitName         String  @map("unit_name")      // "根", "箱", "打"
  conversionFactor Int     @map("conversion_factor") // 1箱=100根 → factor=100
  isBaseUnit       Boolean @default(false) @map("is_base_unit")

  sku Sku @relation(fields: [skuId], references: [id])
  @@map("sku_units")
}

// 收款记录
model PaymentRecord {
  id         String        @id @default(uuid())
  customerId String        @map("customer_id")
  amount     Decimal       @db.Decimal(12, 2)
  method     PaymentMethod
  reference  String?
  notes      String?
  receivedBy String        @map("received_by")
  receivedAt DateTime      @map("received_at")
  tenantId   String        @map("tenant_id")

  customer Customer @relation(fields: [customerId], references: [id])
  @@map("payment_records")
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CHECK
  CREDIT_CARD
  OTHER
}

// 审批申请
model ApprovalRequest {
  id             String         @id @default(uuid())
  type           ApprovalType
  requesterId    String         @map("requester_id")
  customerId     String?        @map("customer_id")
  orderId        String?        @map("order_id")
  currentValue   String?        @map("current_value")
  requestedValue String?        @map("requested_value")
  reason         String?
  status         ApprovalStatus @default(PENDING)
  approvedBy     String?        @map("approved_by")
  approvedAt     DateTime?      @map("approved_at")
  expiresAt      DateTime?      @map("expires_at")
  notes          String?
  tenantId       String         @map("tenant_id")
  createdAt      DateTime       @default(now()) @map("created_at")

  @@map("approval_requests")
}

enum ApprovalType {
  PRICE_OVERRIDE
  CREDIT_INCREASE
  LARGE_ORDER
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}

// 交接班记录
model ShiftHandover {
  id              String   @id @default(uuid())
  operatorId      String   @map("operator_id")
  shiftStart      DateTime @map("shift_start")
  shiftEnd        DateTime @map("shift_end")
  totalOrders     Int      @map("total_orders")
  expectedCash    Decimal  @map("expected_cash") @db.Decimal(12, 2)
  actualCash      Decimal  @map("actual_cash") @db.Decimal(12, 2)
  variance        Decimal  @db.Decimal(12, 2)
  varianceReason  String?  @map("variance_reason")
  evidencePhotos  String[] @map("evidence_photos")
  status          String   @default("COMPLETED")
  tenantId        String   @map("tenant_id")
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("shift_handovers")
}

// 审计日志
model AuditLog {
  id          String   @id @default(uuid())
  operatorId  String   @map("operator_id")
  action      String
  targetType  String   @map("target_type")
  targetId    String   @map("target_id")
  beforeValue Json?    @map("before_value")
  afterValue  Json?    @map("after_value")
  ipAddress   String?  @map("ip_address")
  tenantId    String   @map("tenant_id")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("audit_logs")
}

// 欠货池
model BackorderItem {
  id              String   @id @default(uuid())
  originalOrderId String   @map("original_order_id")
  skuId           String   @map("sku_id")
  backorderQty    Int      @map("backorder_qty")
  fulfilledQty    Int      @default(0) @map("fulfilled_qty")
  status          String   @default("PENDING")
  tenantId        String   @map("tenant_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("backorder_items")
}

// 盘点任务
model StockCountTask {
  id          String          @id @default(uuid())
  warehouseId String          @map("warehouse_id")
  assigneeId  String?         @map("assignee_id")
  status      String          @default("PENDING")
  items       StockCountItem[]
  tenantId    String          @map("tenant_id")
  createdAt   DateTime        @default(now()) @map("created_at")
  completedAt DateTime?       @map("completed_at")

  @@map("stock_count_tasks")
}

model StockCountItem {
  id              String @id @default(uuid())
  stockCountTaskId String @map("stock_count_task_id")
  skuId           String @map("sku_id")
  binLocationId   String? @map("bin_location_id")
  systemQty       Int    @map("system_qty")
  actualQty       Int?   @map("actual_qty")
  variance        Int?

  task StockCountTask @relation(fields: [stockCountTaskId], references: [id])
  @@map("stock_count_items")
}

// 收货质检记录
model ReceivingInspection {
  id              String   @id @default(uuid())
  receiptId       String   @map("receipt_id")
  skuId           String   @map("sku_id")
  expectedQty     Int      @map("expected_qty")
  actualQty       Int      @map("actual_qty")
  damagedQty      Int      @default(0) @map("damaged_qty")
  discrepancyType String?  @map("discrepancy_type")
  photos          String[]
  notes           String?
  tenantId        String   @map("tenant_id")
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("receiving_inspections")
}
```

#### 6.1.3 现有模型扩展

| 模型 | 新增字段/关联 | 说明 |
|------|-------------|------|
| `SalesOrder` | `source` 新增枚举值 `WHOLESALE_SITE`, `SALES_REP`, `PREORDER` | 订单来源追踪 |
| `SalesOrder` | `depositAmount`, `depositPaid` | 预售订单定金 |
| `SalesOrder` | `splitFromOrderId` | 拆单追溯 |
| `Sku` | `moq` (最小起订量) | SKU 级 MOQ |
| `Sku` | `safetyStock`, `reorderPoint` | 安全库存与补货点 |
| `Shipment` | `containerNo`, `vesselName`, `preorderEnabled` | 到柜追踪 |
| `Tenant` | `minOrderAmount` (整单最低金额) | 整单 MOQ |

---

## 7. 核心业务流程

### 7.1 零售商自助采购流程

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  登录    │────▶│ 浏览/搜索 │────▶│  加购    │────▶│ 购物车   │────▶│  下单    │
│         │     │ 商品目录  │     │ (含MOQ   │     │ (信用额度 │     │ (库存锁定│
│         │     │          │     │  校验)   │     │  校验)   │     │  + 扣额度)│
└─────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                                         │
     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
     │ 已签收   │◀────│ 已发货   │◀────│ 已打包   │◀────│ 拣货中   │◀────┘
     │ (收款登记)│     │ (物流追踪)│     │ (扫码校验)│     │ (波次合并)│
     └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 7.2 信用额度管控流程

```
客户下单
    │
    ▼
检查信用额度: outstandingBalance + orderAmount <= creditLimit ?
    │
    ├── YES → 正常下单 → outstandingBalance += orderAmount
    │
    └── NO → 前端熔断
              │
              ├── 客户付款 → 财务登记 → outstandingBalance -= paymentAmount
              │                         → creditFrozen 检查 → 自动解冻
              │
              └── 员工申请临时增额 → 推送老板手机
                                      │
                                      ├── 老板同意 → creditLimit 临时增加
                                      │              → 设置过期时间
                                      │              → 交易放行
                                      │
                                      └── 老板驳回 → 通知员工
```

### 7.3 智能拆单流程

```
客户订购: SKU-A × 500, SKU-B × 200
    │
    ▼
库存检查: SKU-A 库存 400, SKU-B 库存 200
    │
    ▼
SKU-A 不足 → 提示用户是否接受拆单？
    │
    ├── 用户接受 →  发货单 1: SKU-A × 400 + SKU-B × 200
    │               欠货记录: SKU-A × 100 → 进入欠货池
    │               原订单状态: PARTIALLY_FULFILLED
    │
    └── 用户拒绝 → 取消订单 / 等待补货后统一发
                    │
                    ▼ (若等待)
                    新货到柜 → 系统匹配欠货池 → 自动提醒
                    → 生成补发单 → 发货
```

### 7.4 交接班对账流程

```
员工点击 "交班"
    │
    ▼
系统自动统计当班数据:
  - 处理订单: 25 笔
  - 应收现金: €3,450.00
  - 赊账金额: €1,200.00
    │
    ▼
弹窗要求输入实际收到现金: €______
    │
    ▼
差异 = 应收 - 实收
    │
    ├── 差异 = 0 → ✅ 正常交班 → 记录归档
    │
    └── 差异 ≠ 0 → ⚠️ 强制填写原因
                    → 拍照上传凭证
                    → 差异 > €50 时推送老板手机
                    → 记录归档（不可修改）
```

### 7.5 波次拣货与出库校验流程

```
10 个订单等待发货
    │
    ▼
系统合并为 1 个波次（按时间窗口或手动选择）
    │
    ▼
生成波次拣货单:
  库位 A-01-01: iPhone 壳 × 50 (订单1:10, 订单2:15, 订单3:25)
  库位 A-01-03: 数据线 × 30 (订单1:5, 订单4:25)
  库位 B-02-01: 保护膜 × 80 (订单5:20, 订单6:60)
  ...
    │
    ▼
库管按路径拣货（一趟走完）
    │
    ▼
分拣台: 按订单号拆分 → 装箱
    │
    ▼
出库校验: 扫描订单条码 → 逐件扫描 SKU 条码
    │
    ├── ✅ 全部匹配 → 确认出库 → 扣减库存 → 更新订单状态
    │
    └── ❌ 扫错/遗漏 → 报警 → 纠正 → 重新扫描
```

### 7.6 供应链到柜与预售流程

```
采购部创建 Shipment（柜号、船期、PO 关联）
    │
    ▼
标记 preorderEnabled = true
    │
    ▼
A 端"预售专区"自动展示柜中商品
    │
    ▼
客户支付定金锁定货权（定金比例可配置）
    │
    ├── 柜到港 → 状态更新 ARRIVED
    │   │
    │   ▼
    │   盲收扫码 → 比对 PO → 差异登记 → 质检
    │   │
    │   ▼
    │   上架入库 → 匹配预售订单 → 通知客户补尾款
    │   │
    │   ▼
    │   收到尾款 → 发货
    │
    └── 柜延误 → 更新 ETA → 自动通知已预定客户
```

---

## 8. 非功能性需求

### 8.1 数据主权与安全

| 需求项 | 要求 | 实现方案 |
|--------|------|---------|
| 私有化部署 | 系统部署在公司自有/独享云服务器 | GCP Cloud Run（独立项目），数据不共享 |
| 数据加密 | 传输加密 + 静态加密 | TLS 1.3（传输）、AES-256（数据库字段级加密：底价、信用额度） |
| 访问控制 | RBAC 角色权限控制 | 6 级角色矩阵（见 3.1.1） |
| 审计追溯 | 关键操作全程留痕 | 审计日志表，INSERT-ONLY |
| GDPR 合规 | 欧盟客户数据保护 | 支持数据导出、删除请求；Cookie 同意机制；隐私政策页面 |
| 备份策略 | 数据零丢失 | 每日全量备份 + 每小时增量备份；跨区域备份副本 |
| 灾难恢复 | RPO < 1 小时，RTO < 4 小时 | 自动故障转移 + 备份恢复演练 |

### 8.2 性能要求

| 场景 | 指标 | 说明 |
|------|------|------|
| A 端页面加载 | 首屏加载 ≤ 1.5 秒（3G 网络）、交互响应 ≤ 200ms | 欧洲本地 CDN 加速 |
| 快速批量单录入 | 输入 200+ SKU 无卡顿（FPS ≥ 30） | 虚拟列表渲染 + 防抖搜索 |
| 扫码响应 | 扫码后 ≤ 300ms 返回匹配结果 | 本地缓存 SKU 索引 |
| 并发下单 | 支持 50 个客户同时下单 | 乐观锁 + 库存预扣 |
| 报表查询 | 月度对账单生成 ≤ 5 秒 | 预聚合 + 缓存 |
| API 响应 | P99 ≤ 500ms | 数据库索引优化 + 连接池 |

### 8.3 可用性与运维

| 需求项 | 要求 |
|--------|------|
| 可用性 | 99.5% SLA（月度） |
| 监控告警 | 服务异常 ≤ 2 分钟内告警（邮件 + Slack） |
| 日志 | 结构化日志 + 集中收集（Cloud Logging） |
| 版本管理 | Artifact Registry 保留 ≤ 2 个版本，自动清理旧版本 |

### 8.4 技术栈

| 层 | 技术选型 | 说明 |
|----|---------|------|
| 前端 (A端/C端) | Next.js 15 + React 19 + Tailwind CSS + shadcn/ui | 与现有项目一致 |
| 后端 | NestJS + Prisma + PostgreSQL | 与现有项目一致 |
| 数据库 | Neon Serverless PostgreSQL | 现有基础设施 |
| 部署 | GCP Cloud Run | 现有部署方案 |
| 认证 | JWT + 多租户 | 现有认证体系 |
| 文件存储 | GCP Cloud Storage | 图片、PDF、凭证照片 |
| 推送 | Web Push API + 邮件 | C 端审批推送 |

---

## 9. 优先级与里程碑

### 9.1 阶段划分

```
Phase 1 (P0) ─── Phase 2 (P1) ─── Phase 3 (P2) ─── Phase 4 (P3)
 基础采购闭环     信用风控+WMS基础    WMS高级+C端       全面优化
 4 周              4 周               4 周              持续
```

### 9.2 Phase 1 — P0 基础采购闭环（约 4 周）

> **目标**: 零售商可登录、浏览、下单，订单进入仓库系统。

| # | 功能模块 | 具体内容 | 优先级 |
|---|---------|---------|-------|
| P0-01 | A 端-注册/登录 | 零售商注册、登录、JWT 认证 | 🔴 必须 |
| P0-02 | A 端-商品浏览 | 类目导航、商品列表、商品详情（登录后见价格） | 🔴 必须 |
| P0-03 | A 端-购物车 | 加购、改数量、删除、SKU 级 MOQ 校验 | 🔴 必须 |
| P0-04 | A 端-下单 | 提交订单、库存锁定、订单列表/详情 | 🔴 必须 |
| P0-05 | A 端-分级定价 | 按客户等级自动计算价格 | 🔴 必须 |
| P0-06 | B 端-代客下单 | 后台替客户开单 | 🟡 重要 |
| P0-07 | B 端-订单管理 | 查看/处理批发站来源订单 | 🔴 必须 |

### 9.3 Phase 2 — P1 信用风控 + WMS 基础（约 4 周）

| # | 功能模块 | 具体内容 | 优先级 |
|---|---------|---------|-------|
| P1-01 | 信用额度管控 | 额度设置、熔断、自动解冻 | 🔴 必须 |
| P1-02 | 再来一单 | 上次采购清单一键复购 | 🟡 重要 |
| P1-03 | 快速批量单 | 矩阵表格 + 扫码录入 | 🟡 重要 |
| P1-04 | 审计日志 | 关键操作日志 | 🔴 必须 |
| P1-05 | 交接班对账 | 强制对账弹窗 | 🔴 必须 |
| P1-06 | 对账单 PDF | 月度对账单生成与发送 | 🟡 重要 |
| P1-07 | 出库扫码校验 | 防错校验基础版 | 🔴 必须 |
| P1-08 | 跨端草稿箱同步 | 服务端购物车同步 | 🟡 重要 |

### 9.4 Phase 3 — P2 WMS 高级 + C 端（约 4 周）

| # | 功能模块 | 具体内容 | 优先级 |
|---|---------|---------|-------|
| P2-01 | 波次拣货 | 多单合并拣货 + 路径优化 | 🟡 重要 |
| P2-02 | 智能拆单/欠货池 | 拆单、欠货记录、到货预警 | 🟡 重要 |
| P2-03 | 到柜预报 + 盲收 | Shipment 追踪、PDA 盲收、质检 | 🟡 重要 |
| P2-04 | 动态库位图 | 可视化库位管理 | 🟢 期望 |
| P2-05 | 循环盘点 | 自动生成盘点任务 | 🟡 重要 |
| P2-06 | 库存预警 | 安全库存计算 + 采购建议 | 🟡 重要 |
| P2-07 | C 端看板 | 每日简报 + 动销红黑榜 | 🟡 重要 |
| P2-08 | C 端审批 | 移动端特批权限 | 🔴 必须 |

### 9.5 Phase 4 — P3 全面优化（持续迭代）

| # | 功能模块 | 具体内容 |
|---|---------|---------|
| P3-01 | 预售/期货 | 预售专区 + 定金机制 |
| P3-02 | 特价/清仓专区 | 自动化促销管理 |
| P3-03 | 多单位换算 | SKU 多计量单位支持 |
| P3-04 | 合同专属价 | 客户级特殊定价 |
| P3-05 | 整单 MOQ | 订单级最低金额限制 |
| P3-06 | 销售报表 | 按客户/SKU/时间维度分析 |
| P3-07 | 采购意图分析 | 基于浏览/加购/搜索行为的报表 |
| P3-08 | Shopify 集成 | Webhook 自动创建订单 |
| P3-09 | WhatsApp 集成 | 订单通知 + 对账单发送 |

### 9.6 本期不做（Out of Scope）

- ❌ 在线支付集成（Stripe/PayPal），仅支持线下付款 + 系统登记
- ❌ 多币种支持（仅 EUR）
- ❌ 多语言国际化（仅英文，类目名保留中英双语字段）
- ❌ 移动端原生 App（采用 PWA 替代）
- ❌ AI 智能推荐（后续迭代）
- ❌ 自动化物流对接（本期手工录入物流信息）

---

## 10. 术语表

| 术语 | 英文 | 说明 |
|------|------|------|
| A 端 | Buyer Portal | 零售商专属采购前台 |
| B 端 | Admin Console | 内勤管理后台 + WMS 仓储系统 |
| C 端 | Boss Mobile | 老板移动决策中心 |
| SKU | Stock Keeping Unit | 最小库存管理单位 |
| MOQ | Minimum Order Quantity | 最小起订量 |
| WMS | Warehouse Management System | 仓库管理系统 |
| PDA | Personal Digital Assistant | 手持数据终端（扫码枪） |
| 波次拣货 | Wave Picking | 合并多订单的拣货方式 |
| 盲收 | Blind Receiving | 不预知采购单内容直接扫码验收 |
| 熔断 | Circuit Breaker | 信用额度超限后自动冻结下单 |
| 欠货池 | Backorder Pool | 因缺货而暂挂的待发货记录 |
| 定金 | Deposit | 预售订单中预付的部分款项 |
| 对账单 | Statement of Account | 客户月度购销往来汇总 |
| 底价 | Floor Price | 某 SKU 允许售卖的最低价格 |
| 交接班 | Shift Handover | 员工换班时的强制对账流程 |
| 审计日志 | Audit Log | 关键操作的不可篡改记录 |

---

## 附录 A：与现有系统关系映射

| 现有模块 | 本 PRD 对应功能 | 复用/扩展 |
|---------|----------------|----------|
| Category API | A 端类目导航 | 直接复用 |
| Product/SKU | A 端商品展示与定价 | 复用 + 扩展（MOQ、单位换算） |
| Customer + CustomerTier | A 端分级定价 | 复用 + 扩展（信用额度） |
| SalesOrder | A 端下单 + B 端订单管理 | 复用 + 扩展（来源、拆单） |
| Inventory + Ledger | WMS 库存管控 | 复用 + 扩展（预警、盘点） |
| Warehouse + BinLocation | WMS 库位管理 | 复用 + 扩展（可视化库位图） |
| Shipment + PackingList | WMS 到柜追踪 + 盲收 | 复用 + 扩展（预售联动） |
| JWT + Tenant | 全端认证 | 复用 |

---

## 附录 B：API 设计规范

### B.1 A 端 API（零售商端）

| 方法 | 路径 | 登录 | 说明 |
|------|------|------|------|
| GET | `/api/public/categories/tree` | 否 | 类目树 |
| GET | `/api/public/products` | 否 | 商品列表（无价格） |
| GET | `/api/public/products/:id` | 否 | 商品详情（无价格） |
| POST | `/api/auth/wholesale/register` | 否 | 零售商注册 |
| POST | `/api/auth/wholesale/login` | 否 | 零售商登录 |
| GET | `/api/wholesale/products` | 是 | 含价格的商品列表 |
| GET | `/api/wholesale/products/:id` | 是 | 含价格的商品详情 |
| GET | `/api/wholesale/cart` | 是 | 购物车 |
| POST | `/api/wholesale/cart/items` | 是 | 加购/改量 |
| DELETE | `/api/wholesale/cart/items/:skuId` | 是 | 删除购物车项 |
| POST | `/api/wholesale/orders` | 是 | 下单 |
| GET | `/api/wholesale/orders` | 是 | 订单列表 |
| GET | `/api/wholesale/orders/:id` | 是 | 订单详情 |
| GET | `/api/wholesale/account/credit` | 是 | 信用额度查询 |
| GET | `/api/wholesale/account/statement` | 是 | 对账单查询 |
| POST | `/api/wholesale/reorder/:orderId` | 是 | 再来一单 |
| POST | `/api/wholesale/bulk-order` | 是 | 批量下单 |

### B.2 B 端 API（管理后台）

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| POST | `/api/admin/orders/create-for-customer` | SALES | 代客下单 |
| POST | `/api/admin/orders/:id/split` | SALES, ADMIN | 拆单 |
| GET | `/api/admin/backorders` | SALES, WAREHOUSE | 欠货池列表 |
| POST | `/api/admin/customers/:id/credit` | FINANCE | 设置信用额度 |
| POST | `/api/admin/payments` | FINANCE | 登记收款 |
| GET | `/api/admin/customers/:id/statement` | FINANCE | 生成对账单 PDF |
| POST | `/api/admin/shift/handover` | ALL | 交接班 |
| GET | `/api/admin/audit-logs` | ADMIN | 审计日志 |
| POST | `/api/admin/approvals` | SALES | 提交审批申请 |
| PATCH | `/api/admin/approvals/:id` | SUPER_ADMIN | 审批（同意/驳回） |

### B.3 WMS API

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| POST | `/api/wms/receiving/blind-receive` | WAREHOUSE | 盲收扫码 |
| POST | `/api/wms/receiving/:id/inspection` | WAREHOUSE | 质检记录 |
| GET | `/api/wms/inventory/alerts` | WAREHOUSE, ADMIN | 库存预警 |
| GET | `/api/wms/inventory/suggestions` | WAREHOUSE, ADMIN | 采购建议 |
| POST | `/api/wms/stock-count` | WAREHOUSE | 创建盘点任务 |
| PATCH | `/api/wms/stock-count/:id` | WAREHOUSE | 录入盘点结果 |
| POST | `/api/wms/waves` | WAREHOUSE | 创建波次 |
| GET | `/api/wms/waves/:id/pick-list` | WAREHOUSE | 波次拣货单 |
| POST | `/api/wms/packing/:orderId/verify` | WAREHOUSE | 出库扫码校验 |

### B.4 C 端 API（老板移动端）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/boss/dashboard` | 经营看板数据 |
| GET | `/api/boss/daily-report` | 每日经营简报 |
| GET | `/api/boss/rankings` | 动销红黑榜 |
| GET | `/api/boss/approvals` | 待审批列表 |
| PATCH | `/api/boss/approvals/:id` | 审批操作 |

---

*文档版本: v1.0 | 最后更新: 2026-03-16*
