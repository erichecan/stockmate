// Updated: 2026-03-18T23:04:10 - Admin 仪表盘接入核心运营数据
'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    orders: 0,
    wavesCandidate: 0,
    shipments: 0,
    notifications: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, shipmentsRes, notificationsRes] = await Promise.all([
          authApi.get('/sales-orders', { params: { page: 1, limit: 1 } }),
          authApi.get('/purchasing/shipments/forecast'),
          authApi.get('/notifications/me', { params: { limit: 100 } }),
        ]);

        const orderTotal = Number(ordersRes.data?.total ?? 0);
        const shipments = Array.isArray(shipmentsRes.data) ? shipmentsRes.data : [];
        const notifications = Array.isArray(notificationsRes.data?.data)
          ? notificationsRes.data.data
          : [];

        setStats({
          orders: orderTotal,
          wavesCandidate: orderTotal,
          shipments: shipments.length,
          notifications: notifications.length,
        });
      } catch {
        setStats({
          orders: 0,
          wavesCandidate: 0,
          shipments: 0,
          notifications: 0,
        });
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        运营核心指标总览
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.orders}</p>
            <p className="text-xs text-muted-foreground">销售订单总量</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waves</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.wavesCandidate}</p>
            <p className="text-xs text-muted-foreground">可生成波次订单</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.shipments}</p>
            <p className="text-xs text-muted-foreground">到柜预报中的货柜</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.notifications}</p>
            <p className="text-xs text-muted-foreground">当前账号通知数量</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
