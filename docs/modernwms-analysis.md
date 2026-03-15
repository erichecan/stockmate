# ModernWMS-master 项目分析与可借鉴模块

> 分析时间：2025-03-14  
> 目的：供 StockMate 借鉴功能与模块设计

---

## 一、项目概览

**ModernWMS** 是一款开源的**简易完整仓库管理系统**，面向中小企业的仓储供应链流程，技术栈与 StockMate 不同，但业务模块划分清晰，适合作为功能与流程设计的参考。

- **后端**：.NET 7、ASP.NET Core、EF Core，支持 MySQL 8+ / SQL Server 2017+ / PostgreSQL 12
- **前端**：Vue 3.2 + TypeScript + Vite 4 + Vuetify 3 + VXE Table 4
- **特性**：二维码、Docker、i18n、多数据库

---

## 二、后端模块结构（Controllers / Services / Entities）

### 2.1 Controller 一览（按业务域）

| 模块分类 | Controller | 功能说明 |
|----------|------------|----------|
| **到货/入库** | `AsnController` | 到货单(ASN)主从、确认到货、卸货、分拣、上架 |
| **库存** | `StockController` | 库存明细、安全库存查询 |
| | `StockadjustController` | 库存调整单 |
| | `StockfreezeController` | 库存冻结 |
| | `StockmoveController` | 库存移动 |
| | `StockprocessController` | 库存加工/处理 |
| | `StocktakingController` | 盘点 |
| **出库/发货** | `DispatchlistController` | 发货单、拣货、出库 |
| **主数据** | `WarehouseController` | 仓库 |
| | `WarehouseareaController` | 库区 |
| | `GoodslocationController` | 货位 |
| | `GoodsownerController` | 货主 |
| | `CategoryController` | 分类 |
| | `SpuController` | SPU |
| | `SkuController`（通过 Spu） | SKU/商品 |
| | `CustomerController` | 客户 |
| | `SupplierController` | 供应商 |
| | `CompanyController` | 公司/租户 |
| **配置与权限** | `UserController` | 用户 |
| | `UserroleController` | 用户角色 |
| | `RolemenuController` | 角色菜单权限（菜单树、按角色查权限） |
| | `PrintSolutionController` | 打印方案 |
| | `FreightfeeController` | 运费设置 |
| **其他** | `ActionLogController` | 操作日志 |

### 2.2 核心实体（Entities/Models）

- **到货**：`AsnmasterEntity`、`AsnEntity`、`AsnsortEntity`
- **库存**：`StockEntity`、`StockadjustEntity`、`StockfreezeEntity`、`StockmoveEntity`、`StockprocessEntity`、`StocktakingEntity`
- **出库**：`DispatchlistEntity`、`DispatchpicklistEntity`
- **主数据**：`WarehouseEntity`、`WarehouseareaEntity`、`GoodslocationEntity`、`GoodsownerEntity`、`CategoryEntity`、`SpuEntity`、`SkuEntity`、`CustomerEntity`、`SupplierEntity`、`CompanyEntity`
- **权限**：`MenuEntity`、`RolemenuEntity`
- **工作流/打印**：`FlowSetEntity`、`PrintSolutionEntity`、`FreightfeeEntity`

### 2.3 后端设计特点（可借鉴）

- **统一 BaseController**：注入 `CurrentUser`（从 JWT Claim 反序列化），所有接口可复用当前用户、租户信息。
- **统一分页与返回**：`PageSearch`、`ResultModel<T>`、`PageData<T>`，便于前端统一处理。
- **Service 分层**：每个业务一个 Service 接口 + 实现，Controller 只做参数与调用。
- **多语言**：`IStringLocalizer<ModernWMS.Core.MultiLanguage>` 在 Controller 中用于错误/提示文案。

---

## 三、前端模块结构（view / api / router）

### 3.1 路由与菜单（与权限联动）

- 路由：**动态路由**，根据登录后接口返回的 `menulist`（含 `vue_path`、`vue_directory`、`module`）通过 `menusToRouter()` 生成路由并 `router.addRoute('home', item)`。
- 菜单：同一份 `menulist` 通过 `menusToSideBar()` 转成侧栏结构（含一级/二级、icon、i18n key）。
- 页面路径约定：`../view/${module}/${vue_path}/${vue_path}.vue`，如 `base/commodityManagement/commodityManagement.vue`。

### 3.2 功能模块（view 与 api 对应）

| 前端模块（vue_path / directory） | 对应 API/后端 | 说明 |
|----------------------------------|---------------|------|
| **base** | | |
| ownerOfCargo | 货主 | 货主管理 |
| menuBasicSettings | - | 基础设置入口 |
| userManagement | User | 用户管理 |
| commodityCategorySetting | Category | 商品分类 |
| commodityManagement | Spu/Sku | 商品/SPU/SKU |
| userRoleSetting | Userrole | 用户角色 |
| companySetting | Company | 公司设置 |
| freightSetting | Freightfee | 运费设置 |
| warehouseSetting | Warehouse/Area/Goodslocation | 仓库/库区/货位 |
| customer | Customer | 客户 |
| print | PrintSolution | 打印方案 |
| supplier | Supplier | 供应商 |
| roleMenu | Rolemenu | 角色-菜单权限 |
| **wms** | | |
| stockManagement | Stock | 库存明细、安全库存 |
| stockAsn | Asn | 到货单、到货→卸货→分拣→上架 |
| **warehouseWorking** | | |
| warehouseProcessing | Stockprocess | 库存加工 |
| warehouseMove | Stockmove | 库存移动 |
| warehouseFreeze | Stockfreeze | 库存冻结 |
| warehouseAdjust | Stockadjust | 库存调整 |
| warehouseTaking | Stocktaking | 盘点 |
| **deliveryManagement** | Dispatchlist | 发货单、拣货、出库 |
| **statisticAnalysis** | | |
| saftyStock | Stock | 安全库存统计 |
| deliveryStatistic | Dispatchlist | 发货统计 |
| asnStatistic | Asn | 到货统计 |
| stockageStatistic | Stock | 库龄统计 |
| **其他** | | |
| vwms | - | 3D 仓库可视化（Unity） |
| largeScreen | - | 大屏看板 |

### 3.3 前端技术特点（可借鉴）

- **Tab 式业务流**：如 `stockAsn.vue` 用多个 Tab（待到货、待卸货、待分拣、待上架、到货明细）串联到货流程，适合在 StockMate 做「采购到货」「销售出库」等分步流程。
- **VXE Table**：表格增删改、导出、打印、与后端分页对接，可参考其表格交互与接口封装。
- **API 按业务域拆分**：`api/base/*`、`api/wms/*`、`api/sys/*`，与后端 Controller 分组对应，便于维护。
- **i18n**：菜单、表格列、提示语均用 i18n key，便于中英等多语言扩展。

---

## 四、与 StockMate 的对比与可借鉴点

### 4.1 已有对应关系（StockMate 已有类似能力）

| ModernWMS | StockMate 对应 |
|-----------|----------------|
| 仓库/库区/货位 | 仓储管理、多仓库 |
| 分类 / SPU / SKU | 商品管理（分类、品牌、产品、SKU） |
| 客户 / 供应商 | 客户、供应商 |
| 用户 / 角色 / 菜单权限 | 多租户、权限体系 |
| 到货单(ASN)→上架 | 采购收货、入库 |
| 发货单→拣货→出库 | 销售订单、拣货、出库 |

### 4.2 建议借鉴的功能与模块

**本小节重点**：收货 6 状态/6 Tab、库存管理（库位列表 + 库存列表）、安全库存/发货/收货三类统计、仓内作业五类（加工/移动/冻结/调整/盘点）均建议直接借鉴；其余为基础设置、权限、打印、发货单、操作日志等配套能力。

0. **基础设置（类 CRM）**（详见 [4.3 基础设置（类 CRM）](#43-基础设置类-crm建议重点借鉴)）
   - 公司、客户、供应商、货主、仓库/库区/货位、商品分类与 SPU/SKU、用户与角色菜单、运费与打印方案等主数据与配置的集中管理，作为业务单据的信息底座。

1. **收货的 6 个状态 / 6 个 Tab**（建议直接借鉴）
   - 参考：`AsnController` + 前端 `view/wms/stockAsn/stockAsn.vue`。
   - ModernWMS 用 **6 个 Tab** 串联整条收货流程，每个 Tab 对应一个状态/待办视图：

   | 序号 | Tab 名称（vue 中） | 含义 | 对应子组件 |
   |------|--------------------|------|-------------|
   | 1 | tabNotice | 通知/公告 | tabNotice.vue |
   | 2 | tabToDoArrival | 待到货 | tabToDoArrival.vue |
   | 3 | tabToDoUnload | 待卸货 | tabToDoUnload.vue |
   | 4 | tabToDoSorting | 待分拣 | tabToDoSorting.vue |
   | 5 | tabToDoGrounding | 待上架 | tabToDoGrounding.vue |
   | 6 | tabReceiptDetails | 到货明细 | tabReceiptDetails.vue |

   - 借鉴点：采购收货在 StockMate 也采用「通知 → 待到货 → 待卸货 → 待分拣 → 待上架 → 到货明细」的 6 步 Tab 结构，每步独立列表与操作，状态清晰、便于现场作业与追溯。

2. **库存管理：库位列表 + 库存列表**（建议直接借鉴）
   - 参考：`StockController` + 前端 `view/wms/stockManagement/stockManagement.vue`。
   - ModernWMS 在「库存管理」下用 **2 个 Tab** 区分两种视图：

   | Tab | 含义 | 子组件 | 说明 |
   |-----|------|--------|------|
   | tabStockLocation | 库位列表 | tabStockLocation.vue | 按库位维度查看（货位、库区、仓库等） |
   | tabStock | 库存列表 | tabStock.vue | 按 SKU/商品维度查看库存数量与分布 |

   - 借鉴点：StockMate 库存管理页可同样提供「库位列表」「库存列表」两个 Tab，便于仓管既按位置查又按品查。

3. **仓内作业**（建议整体借鉴）
   - 参考：后端 `StockadjustController`、`StockfreezeController`、`StockmoveController`、`StockprocessController`、`StocktakingController`；前端 `view/warehouseWorking/` 下 5 个页面。
   - ModernWMS 将仓内作业拆成 **5 个独立模块**，每个模块单独菜单、列表与单据：

   | 模块 | 前端路径 | 后端 | 说明 |
   |------|----------|------|------|
   | 库存加工 | warehouseProcessing | StockprocessController | 加工/组装等处理，源表→目标表 |
   | 库存移动 | warehouseMove | StockmoveController | 库位间移库 |
   | 库存冻结 | warehouseFreeze | StockfreezeController | 冻结/解冻，锁定数量 |
   | 库存调整 | warehouseAdjust | StockadjustController | 盘盈盘亏等调整单 |
   | 盘点 | warehouseTaking | StocktakingController | 盘点任务与确认 |

   - 借鉴点：在 StockMate 中显式做「仓内作业」菜单，下挂上述 5 类业务入口与单据模型，便于与财务/审计对齐，且与收货、发货形成完整闭环。

4. **安全库存统计、发货统计、收货统计**（建议直接借鉴）
   - 参考：前端 `statisticAnalysis/` 下 `saftyStock`、`deliveryStatistic`、`asnStatistic`；后端 Stock、Dispatchlist、Asn 的统计接口。
   - 三类统计在 ModernWMS 中独立成页，用于报表与看板：

   | 统计 | 前端 vue_path | 说明 |
   |------|----------------|------|
   | 安全库存统计 | saftyStock | 安全库存预警、低于安全库存的 SKU 列表 |
   | 发货统计 | deliveryStatistic | 按时间/客户等维度的发货汇总 |
   | 收货统计 | asnStatistic | 按时间/供应商等维度的到货/ASN 汇总 |

   - 借鉴点：StockMate 报表/首页可增加「安全库存统计」「发货统计」「收货统计」三个统计视图（并可保留库龄统计、大屏看板等），数据来源与维度可对照 ModernWMS 设计。

5. **角色-菜单权限**
   - 参考：`RolemenuController`（GetMenusByRoleId、GetAllMenusAsync、保存角色菜单）、前端 `roleMenu` 与动态路由。
   - 借鉴点：菜单树来自后端，按角色勾选可见菜单，登录后只返回该角色可见的 `menulist`，前端据此生成路由与侧栏，实现真正的菜单级权限。

6. **打印方案**
   - 参考：`PrintSolutionController`、`PrintSolutionEntity`、前端 `base/print`。
   - 借鉴点：打印模板/方案可配置（如标签、发货单、拣货单），与业务单据绑定，便于扩展多种打印场景。

7. **发货单与拣货**
   - 参考：`DispatchlistController`、`DispatchpicklistEntity`、前端 `deliveryManagement`。
   - 借鉴点：发货单主从结构、状态流转、拣货单生成与回写，可与现有销售订单与出库流程对照，补全「发货单→拣货单→出库」的数据模型与状态机。

8. **统计与看板（库龄、大屏）**
   - 参考：`stockageStatistic`、`largeScreen`；安全/发货/收货统计见上条「安全库存统计、发货统计、收货统计」。
   - 借鉴点：库龄统计、大屏看板可作为报表与首页仪表盘的补充数据来源与展示。

9. **操作日志**
   - 参考：`ActionLogController`。
   - 借鉴点：关键操作（入库、出库、调整、冻结、盘点等）写操作日志，便于审计与问题排查。

10. **货主（Goodsowner）**
   - 参考：`GoodsownerController`、多租户/多货主场景。
   - 借鉴点：若需要一仓多货主（如代管、多品牌），可引入货主维度与权限隔离。

### 4.3 基础设置（类 CRM）——建议重点借鉴

ModernWMS 的 **基础设置**（前端 `base` 模块、后端主数据 + 配置类 Controller）集中管理「人、组织、商品主数据、场地」等最基础信息，相当于为 WMS 提供了一套**最小化的 CRM / 主数据管理**能力。业务单据（到货、出库、库存）都依赖这些主数据，因此这块是整体信息管理的底座，非常值得借鉴。

**包含内容概览：**

| 子模块 | 说明 | 对应后端 |
|--------|------|----------|
| 公司设置 | 租户/公司档案（名称、编码、联系信息等） | CompanyController |
| 客户 | 客户档案，用于出库/发货对象 | CustomerController |
| 供应商 | 供应商档案，用于采购/到货来源 | SupplierController |
| 货主 | 货主档案，用于一仓多货主、代管等 | GoodsownerController |
| 仓库设置 | 仓库、库区、货位三级结构 | Warehouse / Warehousearea / Goodslocation |
| 商品分类 | 分类树，用于 SPU/SKU 归类 | CategoryController |
| 商品管理 | SPU/SKU 主数据（编码、名称、条码、规格等） | SpuController、Sku |
| 用户管理 | 登录账号、所属角色 | UserController |
| 用户角色 | 角色定义 | UserroleController |
| 角色菜单 | 角色与菜单权限的勾选关系 | RolemenuController |
| 运费设置 | 运费规则/模板 | FreightfeeController |
| 打印方案 | 标签、单据的打印模板配置 | PrintSolutionController |

**可借鉴点：**

- **信息集中入口**：把「公司、客户、供应商、货主、仓库、商品、用户与权限、打印与运费」统一归在「基础设置」下，便于实施与培训时一次性维护主数据。
- **主数据先行**：业务单（采购单、销售单、到货单、发货单）都引用这些主数据（客户 ID、供应商 ID、仓库/货位、SKU 等），保证全系统口径一致，报表与追溯清晰。
- **类 CRM 的定位**：不追求完整 CRM 的销售漏斗、商机跟进，而是把**往来方（客户/供应商）+ 组织（公司/货主）+ 商品 + 场地 + 权限**做成清晰的主数据层，为进销存与仓储提供底座；StockMate 若已有或计划做「客户/供应商/商品」档案，可对照此结构查漏补缺（如货主、打印方案、运费规则等）。

---

## 五、可直接复用的设计思路（不搬代码）

- **接口规范**：分页请求/响应统一（page、pageSize、totals、rows），便于前端表格与后端 Service 统一处理。
- **前后端命名**：后端 `asnmaster`、`dispatchlist` 等与前端 `stockAsn`、`deliveryManagement` 的对应关系，便于团队对齐模块。
- **状态机**：到货单、发货单的「待办→已办」分步状态，便于做待办列表与进度展示。
- **大屏/3D**：若后续要做仓库大屏或 3D 库位，可参考其 largeScreen 与 vwms（Unity）的定位，再选用适合自身技术栈的方案（如 WebGL/Three.js）。

---

## 六、文档与代码位置速查

| 内容 | 路径 |
|------|------|
| 项目说明 | `ModernWMS-master/README.md`、`README.zh_CN.md` |
| 后端入口 | `ModernWMS-master/backend/ModernWMS/` |
| 后端 Controller | `ModernWMS-master/backend/ModernWMS.WMS/Controllers/` |
| 后端 Service 接口 | `ModernWMS-master/backend/ModernWMS.WMS/IServices/` |
| 后端实体 | `ModernWMS-master/backend/ModernWMS.WMS/Entities/Models/` |
| 前端路由与菜单 | `frontend/src/router/index.ts`、`frontend/src/utils/router/index.ts` |
| 前端页面 | `frontend/src/view/` |
| 前端 API | `frontend/src/api/base/`、`frontend/src/api/wms/` |
| 前端 store（含 menulist） | `frontend/src/store/module/user.ts` |

---

以上分析基于对 `ModernWMS-master` 目录下的文档与代码的阅读整理，可直接用于评审和需求讨论；若某一块需要落到 StockMate 的接口设计或数据表设计，可以再按模块细化。
