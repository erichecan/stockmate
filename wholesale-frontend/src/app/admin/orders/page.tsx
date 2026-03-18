// 2026-03-17T12:36:30 - Admin orders skeleton
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<unknown[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/orders').catch(() => ({ data: [] }));
        setOrders(Array.isArray(data) ? data : data?.data ?? []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Order Management</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Admin view of all orders (API: GET /admin/orders)
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders (API not implemented or empty)
            </p>
          ) : (
            <ul className="space-y-2">
              {(orders as { id?: string; orderNumber?: string }[]).slice(0, 10).map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <span className="font-medium">{o.orderNumber ?? o.id}</span>
                  <Badge variant="outline">—</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
