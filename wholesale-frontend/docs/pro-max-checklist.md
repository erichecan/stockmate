# Pro Max 检查清单（批发站页面）

> 2026-03-14 根据 UI/UX Pro Max 技能对首页、类目列表、登录、购物车、订单列表逐页检查并落实的类名与结构建议。

---

## 一、通用规范（已落在 globals.css / layout）

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 可点击元素 `cursor-pointer` | ✅ | base 层对 a, button, [role="button"], select 等已统一 |
| 焦点可见 `focus-visible:ring-2 ring-ring ring-offset-2` | ✅ | base 层 + 各页关键按钮/链接已补 |
| 过渡 150–300ms | ✅ | `transition-colors duration-200` |
| Hover 不造成布局偏移 | ✅ | 仅用 color/border/opacity，未用 scale |
| 使用主题色 | ✅ | `bg-primary`、`border-border`、`text-foreground` 等 |
| 减少动效 `prefers-reduced-motion` | ✅ | html scroll-behavior 已尊重 |

---

## 二、首页 `src/app/page.tsx`

| 检查项 | 状态 | 具体类名/结构 |
|--------|------|----------------|
| 市场导航链接 hover/焦点 | ✅ | `linkNav`：`rounded px-2 py-1 transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer` |
| 搜索框无障碍 | ✅ | `aria-label="搜索本市场"`，`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| 搜全站按钮 | ✅ | `cursor-pointer transition-colors duration-200 hover:opacity-95 focus-visible:ring-2 ...` |
| 左侧类目链接 | ✅ | 主链接 + 子链接均补 `transition-colors`、`focus-visible:ring-2`、`cursor-pointer` |
| 商品卡片可点击反馈 | ✅ | `cardLink`：`rounded border border-border ... transition-colors duration-200 hover:border-primary hover:bg-accent/30 focus-visible:ring-2 ... cursor-pointer` |
| 图片 alt | ✅ | 所有商品图 `alt={item.name}`，不再用空 alt |
| 导航语义 | ✅ | 顶部 `<nav aria-label="市场导航">` |

**建议复用的常量（已写在组件内）：**

- `linkNav`：顶部市场、产品/供应商/求购 等文字导航
- `cardLink`：所有商品卡片、限时包邮、每日推荐、潜力好货 的 `<a>`

---

## 三、类目列表 `src/app/categories/[id]/page.tsx`

| 检查项 | 状态 | 具体类名/结构 |
|--------|------|----------------|
| 搜索输入 label | ✅ | `<label htmlFor="category-search" className="sr-only">` + `id="category-search"`，`aria-label="搜索当前类目商品"` |
| 搜索框边框/焦点 | ✅ | `border-input`，`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| 商品卡片可点击/焦点 | ✅ | `<a>` 使用 `block cursor-pointer transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md -m-3 p-3` |
| 列表语义 | ✅ | `<ul role="list">`，卡片 `border-border` |
| 分页按钮 | ✅ | `<nav aria-label="分页">`，按钮 `type="button"`、`aria-label="上一页"`/`"下一页"`、`cursor-pointer transition-colors hover:bg-accent focus-visible:ring-2 ... disabled:cursor-not-allowed disabled:opacity-40` |
| 分页信息 | ✅ | `<span aria-live="polite">` 当前页/总页/总数 |

---

## 四、登录 `src/app/(auth)/login/page.tsx`

| 检查项 | 状态 | 具体类名/结构 |
|--------|------|----------------|
| 表单输入带 label | ✅ | `<Label htmlFor="email">` 等，Input 已带 id |
| 图标非装饰 | ✅ | Lucide 图标，展开/收起处 `aria-hidden` |
| 折叠按钮可访问性 | ✅ | 「测试账号」「使用其他公司」按钮补 `aria-expanded`、`aria-label`、`cursor-pointer`、`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg` |
| 公司区域 | ✅ | `role="region"`、`aria-label="公司标识"` |

---

## 五、购物车 `src/app/cart/page.tsx`

| 检查项 | 状态 | 具体类名/结构 |
|--------|------|----------------|
| 区块标题 id | ✅ | `<section aria-labelledby="cart-heading">`，`<h2 id="cart-heading">` |
| 错误提示 | ✅ | `role="alert"`，`text-destructive` |
| 表格边框可见 | ✅ | `border border-border border-collapse`，表头 `border-border bg-muted/50`，单元格 `py-2 px-2` |
| 表头 scope | ✅ | 操作列 `scope="col"` |
| 数量输入 | ✅ | `aria-label={`${it.skuId} 数量`}`，`border-input`，`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| 删除按钮 | ✅ | `type="button"`，`aria-label={`删除 ${it.skuId}`}`，`cursor-pointer transition-colors hover:text-destructive/80 focus-visible:ring-2 ...` |
| 继续选购/提交订单 | ✅ | 链接与按钮均 `cursor-pointer transition-colors` / `duration-200`，`focus-visible:ring-2 ...`，按钮 `disabled:cursor-not-allowed` |

---

## 六、订单列表 `src/app/orders/page.tsx`

| 检查项 | 状态 | 具体类名/结构 |
|--------|------|----------------|
| 区块标题 id | ✅ | `<section aria-labelledby="orders-heading">`，`<h2 id="orders-heading">` |
| 错误提示 | ✅ | `role="alert"`，`text-destructive` |
| 订单行可点击 | ✅ | 每行改为 `<a href={\`/orders/${o.id}\`}>`，`cursor-pointer ... hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| 边框 | ✅ | `border border-border`，空状态也统一 `border-border` |
| 列表语义 | ✅ | `<ul role="list">`，去除默认 list 样式 `list-none p-0 m-0` |

---

## 七、后续可做（未在本次改动的范围）

- **响应式**：在 320 / 768 / 1024 / 1440 各断点跑一遍，确认无横向滚动、无内容被裁切。
- **对比度**：用 DevTools 或 axe 再测一次正文与 muted 文字对比度（建议 ≥4.5:1）。
- **键盘**：全站用 Tab 走一遍，确认焦点顺序合理、无陷阱焦点。
