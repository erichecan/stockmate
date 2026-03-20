// Updated: 2026-03-20T12:08:15 - 员工管理页：出勤情况 + 作业产能
'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type StaffRow = {
  userId: string;
  name: string;
  role: string;
  checkInAt: string | null;
  checkOutAt: string | null;
};

type StaffExecution = {
  staffOnDutyToday: number;
  warehouseOnDutyToday: number;
  opsOnDutyToday: number;
  warehouseStaff: StaffRow[];
  opsStaff: StaffRow[];
  wholesaleOrdersProcessedToday: number;
  warehousePickRunsToday: number;
  unpickedWaveCount: number;
  unpickedOrderCount: number;
};

type OverviewResponse = {
  staffExecution: StaffExecution;
};

export default function AdminStaffPage() {
  const [loading, setLoading] = useState(true);
  const [staffExecution, setStaffExecution] = useState<StaffExecution | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get<OverviewResponse>('/admin/analytics/overview');
      setStaffExecution(data?.staffExecution ?? null);
    } catch {
      setStaffExecution(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const se = staffExecution;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Staff Management</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        员工出勤与执行结果：今日上班人数、打卡/下班、订单处理、拣货进度
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? '加载中…' : '刷新'}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日上班员工</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{se?.staffOnDutyToday ?? '--'}</p>
            <p className="text-xs text-muted-foreground">仓库 + 网站运营</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">仓库上班</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{se?.warehouseOnDutyToday ?? '--'}</p>
            <p className="text-xs text-muted-foreground">WAREHOUSE / PICKER</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">网站运营上班</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{se?.opsOnDutyToday ?? '--'}</p>
            <p className="text-xs text-muted-foreground">OPERATIONS / SALES 等</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">批发网站处理订单</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{se?.wholesaleOrdersProcessedToday ?? '--'}</p>
            <p className="text-xs text-muted-foreground">今日非取消订单数</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">仓库拣货次数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{se?.warehousePickRunsToday ?? '--'}</p>
            <p className="text-xs text-muted-foreground">今日已启动的波次</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">当前未拣货波次</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{se?.unpickedWaveCount ?? '--'}</p>
            <p className="text-xs text-muted-foreground">PENDING / IN_PROGRESS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">未拣货对应订单</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{se?.unpickedOrderCount ?? '--'}</p>
            <p className="text-xs text-muted-foreground">待拣货波次中的订单数</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">仓库人员打卡 / 下班</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-20 animate-pulse rounded bg-muted" />
            ) : (se?.warehouseStaff || []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">今日暂无仓库人员登录</p>
            ) : (
              <div className="space-y-1">
                {se!.warehouseStaff.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <span className="font-medium">{s.name} <span className="text-xs text-muted-foreground">({s.role})</span></span>
                    <span className="text-xs text-muted-foreground">
                      上班 {s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString() : '--'} · 下班{' '}
                      {s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString() : '--'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">批发网站运营打卡 / 下班</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-20 animate-pulse rounded bg-muted" />
            ) : (se?.opsStaff || []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">今日暂无运营人员登录</p>
            ) : (
              <div className="space-y-1">
                {se!.opsStaff.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <span className="font-medium">{s.name} <span className="text-xs text-muted-foreground">({s.role})</span></span>
                    <span className="text-xs text-muted-foreground">
                      上班 {s.checkInAt ? new Date(s.checkInAt).toLocaleTimeString() : '--'} · 下班{' '}
                      {s.checkOutAt ? new Date(s.checkOutAt).toLocaleTimeString() : '--'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
