# 3D 仓库模拟器分析与 StockMate 借鉴方案

> 分析时间：2026-03-14  
> 目的：供 StockMate 借鉴，最终在应用内呈现 3D 仓库/库存可视化页面

---

## 一、3d-warehouse-simulator-develop 项目概览

### 1.1 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 3D 渲染 | **Three.js** (^0.124.0) | WebGL 封装，场景/相机/几何体/材质/光照 |
| 交互 | **OrbitControls**（自带） | 旋转、缩放、平移视角 |
| 模型 | **OBJLoader**（自带） | 加载 .obj 人物模型（拣货员） |
| 数据 | **axios** | 请求远程 API 获取 layout、拣货路径等 |
| 构建 | Webpack 5 | 打包入口 `src/app.js`，Copy 静态 HTML/CSS/OBJ/字体 |

### 1.2 目录与职责

```
3d-warehouse-simulator-develop/
├── src/
│   ├── app.js              # 入口：new Manager(...).init()
│   ├── core/
│   │   ├── Manager.js      # 业务编排：选仓、加载数据、筛选、拣货、上传等
│   │   ├── DataController.js  # 所有 API 请求（getLayout、getRouting、updateStock 等）
│   │   └── Simulator.js    # 3D 核心：场景、相机、货位方块、路径、tooltip、右键菜单
│   ├── lib/
│   │   ├── OrbitControls.js
│   │   └── OBJLoader.js
│   ├── maps/
│   │   └── LAYOUT_CORRIDOR_MAP.js   # 走廊/货位网格映射（A–J 走廊，左右、blocks）
│   ├── util/
│   │   └── index.js        # 坐标转换、颜色、日期校验、路径计算等
│   └── static/
│       ├── index.html
│       ├── styles.css
│       ├── collector_guy.obj
│       └── helvetiker.json         # Three.js 字体，用于 3D 文字
├── server.js               # Express 静态服务 dist/
├── webpack.config.js
└── package.json
```

---

## 二、核心架构与数据流

### 2.1 整体流程

1. **选仓**：`Manager.initDepotSelection()` → `DataController.getDepots()` → 点击 depot 进入仿真场景。
2. **加载布局**：`DataController.getLayout(depotId)` 返回 `{ fillRate, data }`，`data` 为货位列表（含 LocId、Stok、LocWeight、ProWeight、MaxQuan、ProId 等）。
3. **数据转换**：`util.toGridLayout(layout, "get")` 将 API 数据转为**网格布局**：
   - 用 `LAYOUT_CORRIDOR_MAP` + `locToGridPoint(locId)` 得到每个货位的 `(x, z)` 坐标；
   - 补全空货位（`fillEmptySlots`）、障碍块（`fillRestOfLayout`）。
4. **3D 渲染**：`Simulator.initBoxes(layout)` 根据每个 item 的 `(x, z, stock, locWeight, ...)` 创建 `BoxGeometry`，高度映射库存量，颜色由 `util.getColorValue(...)` 决定。
5. **交互**：hover 显示 Tooltip；右键弹出 Add/Remove/History；筛选后 `refreshLayout` 重绘方块；拣货时 `drawRouting` 画路径线并驱动 OBJ 小人移动。

### 2.2 数据格式（API → 网格 → 3D）

- **API 单条货位**（示例）：`LocId`（如 `4A001K1`）、`Stok`、`LocWeight`、`ProWeight`、`MaxQuan`、`ProId` 等。
- **网格项**（toGridLayout 后）：`{ id, x, z, stock, locWeight, proWeight, proCategory, maxQuan, proId, fromWhichResult }`。
- **3D**：每个网格项一个 `Mesh(BoxGeometry, MeshLambertMaterial)`，几何体 `translate` 到 `(x - size.x/2 - 0.5, itemSize/2, z - size.y/2 - 0.5)`，`itemSize` 由 stock 映射到 [0, 1]。

### 2.3 关键文件说明

| 文件 | 作用 |
|------|------|
| **Simulator.js** | 创建 Scene/Camera/Renderer/OrbitControls；`initBoxes` 画方块；`addToScene` 单格逻辑（block/empty/standart）；Tooltip/Actionbar 的 Raycaster 检测；路径 Line、OBJ 小人、拣货点球体。 |
| **util/index.js** | `locToGridPoint`（LocId → 二维坐标）、`toGridLayout`（API → 网格）、`fillRestOfLayout`/`fillEmptySlots`、`determineRoutePaths`、`getColorValue`、`map`、`checkDate`。 |
| **LAYOUT_CORRIDOR_MAP.js** | 固定仓库拓扑：每走廊左右 range、blocks（不可用格），用于 `locToGridPoint` 与填空位。 |
| **DataController.js** | 所有接口封装（getDepots、getLayout、getCategories、filterLayout、updateStock、getLocHistory、getRouting、uploadNewLayout、uploadReplenishmentData 等）。 |

---

## 三、StockMate 要做的事（实现一个 3D 效果页面）

### 3.1 目标

在 StockMate 中新增**一个页面**（例如「3D 仓库」或「仓库可视化」），能够：

- 选择仓库（或直接使用当前仓库上下文）；
- 从**现有后端 API** 拿到货位/库存数据（或新写一个聚合接口）；
- 在浏览器中用 **Three.js** 渲染 3D 场景：货位为方块、高度表示库存、可旋转/缩放查看；
- 可选：hover 显示货位/库存信息、简单筛选（按库区/类别）后刷新 3D。

不要求第一版就做拣货路径动画、OBJ 小人、上传布局等，可分阶段。

### 3.2 技术选型建议（与当前 StockMate 对齐）

| 项目 | 3d-warehouse-simulator | StockMate 建议 |
|------|------------------------|----------------|
| 框架 | 纯 Vanilla JS | **Next.js (App Router) + React**，新页面为 `app/(dashboard)/dashboard/warehouse-3d/page.tsx` 或类似 |
| 3D 库 | Three.js | **Three.js**（与参考项目一致，生态成熟） |
| 语言 | JS | **TypeScript**（与 frontend 一致） |
| 样式 | 独立 CSS | **Tailwind** 或现有 UI 组件，与 dashboard 统一 |
| 数据 | 独立 DataController + 远程 API | **React Query + 现有或新写的 API**（见下） |

### 3.3 后端/数据

- **需要的数据**：当前仓库下的**货位列表 + 库存**（货位 ID、坐标或区域、当前数量、最大容量、商品/分类等，视你现有模型而定）。
- **实现方式**：
  - **方案 A**：现有「仓库」「库存」「货位」相关 API 已有列表接口 → 前端拼成一个「layout」结构，再在浏览器里转成网格（见下）。
  - **方案 B**：后端新增一个「仓库 3D 布局」接口，返回已按仓库拓扑排好的货位+库存列表（类似 3d-simulator 的 GetLayout），前端只做展示与筛选。

若 StockMate 的货位没有「走廊+左右+blocks」这种固定拓扑，可以简化为**规则网格**（例如按库区/排/层生成 (x, z)），无需完全照抄 `LAYOUT_CORRIDOR_MAP`。

### 3.4 前端实现步骤（To-Do 式）

1. **依赖**
   - 在 `frontend/package.json` 增加 `three`（及可选 `@types/three`）。
   - 若要用 OrbitControls，用 Three 自带或 `three/examples/jsm/controls/OrbitControls`（ESM）。

2. **新页面与路由**
   - 新建页面，例如：`src/app/(dashboard)/dashboard/warehouse-3d/page.tsx`。
   - 在 dashboard 侧栏增加入口（如「3D 仓库」或「仓库可视化」），指向该路由。

3. **3D 容器**
   - 页面内一个全屏或大块 `div`（ref），用于挂载 `WebGLRenderer.domElement`。
   - 用 `useEffect` 在客户端创建 Scene、PerspectiveCamera、WebGLRenderer、OrbitControls，并在 resize 时更新 camera aspect 和 renderer size；cleanup 时 dispose 和移除 canvas。

4. **数据拉取与转换**
   - 用 React Query 请求「当前仓库的货位+库存」数据（或新接口）。
   - 写一个「API 数据 → 网格数据」的转换函数（类似 `toGridLayout`）：输出 `{ id, x, z, stock, ... }` 列表。若没有复杂走廊拓扑，可用简单规则（如按货位编码或库区排层算 x/z）。

5. **渲染货位方块**
   - 根据网格数据在 Three 场景中创建 `BoxGeometry` + `MeshLambertMaterial`（或 MeshStandardMaterial），位置与高度逻辑可参考 Simulator 的 `addToScene`（高度可映射 stock/maxQuan）。
   - 颜色可按库区、库存率等简单规则区分（参考 `getColorValue`）。

6. **交互（可选）**
   - **Raycaster + 鼠标**：hover 时检测相交的 mesh，显示 Tooltip（用 React 状态 + 绝对定位的 div 即可）。
   - **筛选**：加下拉或勾选（库区、分类等），筛选后重新请求或前端过滤，再更新 3D 场景（清除旧 mesh，按新数据重新创建）。

7. **性能与可维护性**
   - 货位很多时，可考虑 InstancedMesh 或按视野 LOD，首版可简单用多个 Mesh。
   - 将「场景创建/更新/销毁」封装成自定义 Hook（如 `useWarehouseScene`）或工具函数，便于后续加路径动画、多仓库切换等。

### 3.5 可复用与需改造的部分

| 从 3d-simulator 可借鉴 | 在 StockMate 中的注意点 |
|------------------------|---------------------------|
| **Simulator 的渲染思路**（Scene/Camera/Light/Box 创建、OrbitControls） | 改为 React 组件内用 ref + useEffect 管理生命周期，避免重复创建。 |
| **`addToScene` 的单格逻辑**（block/empty/standart、高度与颜色） | 数据字段名改为与你 API 一致（如 skuId、quantity、capacity）。 |
| **util 的 `getColorValue`、`map`** | 可直接借鉴或简化（按库存率/库区上色）。 |
| **`locToGridPoint`、LAYOUT_CORRIDOR_MAP** | 仅当你有类似「走廊+左右+blocks」拓扑时复用；否则用你自己的「货位 → (x,z)」规则。 |
| **DataController** | 不直接复用，用 React Query + 现有 API 或新接口替代。 |
| **Manager 的筛选/拣货/上传** | 第二期再考虑；首版可只做「选仓库 + 展示 3D + hover + 简单筛选」。 |

### 3.6 小结

- **3d-warehouse-simulator** 的核心是：**远程 layout 数据 → 网格坐标 + 库存/属性 → Three.js 方块 + 交互与路径动画**。
- **StockMate** 要做出 3D 页面需要：
  1. 引入 Three.js，在新页面中挂载 3D 场景；
  2. 确定「货位+库存」的数据来源与格式，并实现一层「API → 网格」转换；
  3. 用网格数据驱动 3D 方块（位置、高度、颜色），并可选做 hover、筛选。

按上述步骤分阶段做（先展示 3D，再交互，再路径/高级功能），即可在 StockMate 内复现并延续 3D 仓库可视化的效果。
