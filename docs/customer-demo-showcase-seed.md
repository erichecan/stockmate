# 客户演示专用种子数据

> Updated: 2026-03-19T18:56:00  
> 目的：在租户 `test-company` 下写入**固定单号**的订单/发票/波次/退货，便于向客户讲解「订单全链路 + 未结账单 + 拣货 + 退货」界面。

## 与全量 demo 种子的关系

- `npm run seed:demo-data`：覆盖考勤、波次、发票、收款、通知等**通用**演示数据（部分逻辑在「已有数据」时会跳过）。
- `npm run seed:showcase`：**追加/刷新**本页所述的 `SO-DEMO-SHOW-*` 等**客户讲解专用**数据；可重复执行，演示单与演示波次行会按脚本定义重置。

推荐顺序（本地或 Neon 指向同一库时）：

1. 主 `seed`（若项目有）
2. `seed:warehouse` → `seed:sales` → `seed:demo-users`
3. `seed:demo-data`（可选）
4. **`seed:showcase`**

```bash
cd backend
npm run seed:showcase
```

环境变量：与其它 Prisma 种子相同，需 `DATABASE_URL` 或 `DIRECT_DATABASE_URL`。

## 写入内容摘要

| 类型 | 标识 | 说明 |
|------|------|------|
| 销售单 | `SO-DEMO-SHOW-01` … `12` | DRAFT / PENDING / CONFIRMED / PICKING / PACKED / SHIPPED / PARTIALLY_FULFILLED / CANCELLED |
| 发票 | `INV-DEMO-SHOW-UNPAID` | 绑定 `SO-DEMO-SHOW-04`，状态未付，用于「未支付成功」列表 |
| 拣货波次 | `WV-DEMO-SHOW-001` | 含订单 05、06，状态进行中 |
| 退货 | `intakeNotes` 含 `[DEMO-SHOWCASE-RETURN]` | 关联 `SO-DEMO-SHOW-10`，登记态 |

讲解时可在管理端按单号前缀 **`SO-DEMO-SHOW-`** 或发票号 **`INV-DEMO-SHOW-UNPAID`** 搜索定位。
