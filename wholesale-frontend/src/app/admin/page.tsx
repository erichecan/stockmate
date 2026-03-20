// Updated: 2026-03-20T15:21:30 - 经营总览新增本月退货数量，移除可补充维度与高营收日Top5
'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type TrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

type ProductRow = {
  skuCode: string;
  productName: string;
  qty: number;
};

type RetailerRow = {
  customerId: string;
  customerName: string;
  customerCode: string;
  orderCount: number;
  amount: number;
};

type Overview = {
  month: string;
  todayRevenue: number;
  monthRevenue: number;
  monthOrderCount: number;
  averageOrderAmount: number;
  newCustomers: number;
  trends: TrendPoint[];
  topProductsByQty: ProductRow[];
  topRetailersByAmount: RetailerRow[];
  topRetailersByOrderCount: RetailerRow[];
  extraMetrics: {
    pendingOrderCount: number;
    returnCountMonth: number;
    creditRiskCustomerCount: number;
    uniqueBuyers: number;
    repeatBuyers: number;
    repeatBuyerRate: number;
  };
};

function formatAmount(value: number) {
  return `€${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const load = async (targetMonth: string) => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/admin/analytics/overview', {
        params: { month: targetMonth },
      });
      setOverview(data ?? null);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(month);
  }, [month]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Boss Business Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        老板经营总览：经营金额、走势、客单价、新客、TOP 榜单
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">统计月份</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 h-9 rounded border border-input bg-background px-2 text-sm"
          />
        </div>
        <Button variant="outline" onClick={() => load(month)}>
          刷新
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日经营金额</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading || !overview ? '--' : formatAmount(overview.todayRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">今日非取消订单金额合计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本月经营金额</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading || !overview ? '--' : formatAmount(overview.monthRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {loading || !overview ? '--' : `${overview.month} 订单金额合计`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均交易金额</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading || !overview ? '--' : formatAmount(overview.averageOrderAmount)}
            </p>
            <p className="text-xs text-muted-foreground">本月客单价（AOV）</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本月新客户数量</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading || !overview ? '--' : overview.newCustomers}
            </p>
            <p className="text-xs text-muted-foreground">按客户创建时间统计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本月退货数量</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading || !overview ? '--' : overview.extraMetrics.returnCountMonth}
            </p>
            <p className="text-xs text-muted-foreground">本月退货记录总数</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本月经营金额走势</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[260px] animate-pulse rounded bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={overview?.trends || []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(8)}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(v: number) => `€${v}`}
                    tick={{ fontSize: 11 }}
                    width={60}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value) => [`€${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, '金额']}
                    labelFormatter={(label) => `日期: ${String(label)}`}
                  />
                  <Bar dataKey="revenue" fill="hsl(221 83% 53%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本月订单走势</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[260px] animate-pulse rounded bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={overview?.trends || []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(8)}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    width={36}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value)} 单`, '订单数']}
                    labelFormatter={(label) => `日期: ${String(label)}`}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--chart-2, 160 60% 45%))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">销量最好商品（Top 50）</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-auto">
            <ul className="space-y-2">
              {(overview?.topProductsByQty || []).map((p, idx) => (
                <li key={`${p.skuCode}-${idx}`} className="rounded border px-2 py-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{idx + 1}. {p.productName}</span>
                    <span className="font-semibold">{p.qty}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.skuCode}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">购买金额最多零售商（Top 10）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(overview?.topRetailersByAmount || []).map((r, idx) => (
              <div key={`${r.customerId}-amount`} className="rounded border px-2 py-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>{idx + 1}. {r.customerName}</span>
                  <span className="font-semibold">{formatAmount(r.amount)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{r.customerCode} · {r.orderCount} 单</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">本月购买次数最多零售商（Top 10）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(overview?.topRetailersByOrderCount || []).map((r, idx) => (
              <div key={`${r.customerId}-count`} className="rounded border px-2 py-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>{idx + 1}. {r.customerName}</span>
                  <span className="font-semibold">{r.orderCount} 次</span>
                </div>
                <div className="text-xs text-muted-foreground">{r.customerCode} · {formatAmount(r.amount)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
