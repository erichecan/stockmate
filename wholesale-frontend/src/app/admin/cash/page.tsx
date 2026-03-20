// Updated: 2026-03-20T15:30:15 - 现金与对账页仅保留对账总览与未付名单
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';

type UnpaidRetailer = {
  customerId: string;
  customerName: string;
  customerCode: string;
  unpaidAmount: number;
};

type CashReconciliation = {
  todayOrderCount: number;
  totalReceived: number;
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  unpaidTotal: number;
  unpaidRetailers: UnpaidRetailer[];
};

function formatAmount(value: number) {
  return `€${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function AdminCashPage() {
  // Updated: 2026-03-20T15:30:15 - 今日对账总览数据（无班次/流水/收款录入）
  const [reconciliation, setReconciliation] = useState<CashReconciliation | null>(null);

  // Updated: 2026-03-20T15:30:15 - 从 overview API 获取今日对账汇总
  const loadReconciliation = async () => {
    try {
      const { data } = await authApi.get('/admin/analytics/overview');
      setReconciliation(data?.cashReconciliation ?? null);
    } catch {
      setReconciliation(null);
    }
  };

  useEffect(() => {
    loadReconciliation();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cash & Finance</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        现金与对账：今日收款结构与未付零售商（不含班次与流水）
      </p>
      <div className="mt-4">
        <Button variant="outline" onClick={loadReconciliation}>
          刷新
        </Button>
      </div>

      {/* Updated: 2026-03-20T15:30:15 - 今日对账总览卡片 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日销售订单</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reconciliation?.todayOrderCount ?? '--'}</p>
            <p className="text-xs text-muted-foreground">非取消订单</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日收款总额</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {reconciliation ? formatAmount(reconciliation.totalReceived) : '--'}
            </p>
            <p className="text-xs text-muted-foreground">所有收款方式合计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">未付总额</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {reconciliation ? formatAmount(reconciliation.unpaidTotal) : '--'}
            </p>
            <p className="text-xs text-muted-foreground">全部未结发票欠款</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">收款方式明细</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>现金：{reconciliation ? formatAmount(reconciliation.cashAmount) : '--'}</p>
            <p>Debit 卡：{reconciliation ? formatAmount(reconciliation.debitCardAmount) : '--'}</p>
            <p>信用卡：{reconciliation ? formatAmount(reconciliation.creditCardAmount) : '--'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">未付零售商名单</CardTitle>
        </CardHeader>
        <CardContent>
          {(reconciliation?.unpaidRetailers || []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">暂无未付记录</p>
          ) : (
            <div className="space-y-1">
              {reconciliation!.unpaidRetailers.slice(0, 15).map((r, idx) => (
                <div key={r.customerId} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span>{idx + 1}. {r.customerName} <span className="text-xs text-muted-foreground">({r.customerCode})</span></span>
                  <span className="font-semibold">{formatAmount(r.unpaidAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
