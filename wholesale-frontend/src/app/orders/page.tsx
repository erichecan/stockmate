// Updated: 2026-03-14T18:35:00 - 批发站 P0: 订单列表页（调用 /wholesale/orders）
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type OrderItem = {
  id: string;
  orderNumber: string;
  totalAmount?: number;
  status: string;
  createdAt: string;
};

export default function OrdersPage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;
        if (!token) {
          setError('请先登录后再查看订单列表。');
          setItems([]);
          return;
        }
        const res = await api.get('/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems(res.data?.data || res.data || []);
      } catch {
        setError('加载订单列表失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="space-y-4" aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="text-xl font-semibold text-foreground">订单列表</h2>
      {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {!loading && !error && (
        <ul className="space-y-2 text-xs list-none p-0 m-0" role="list">
          {items.map((o) => (
            <li key={o.id}>
              <a
                href={`/orders/${o.id}`}
                className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div>
                  <div className="font-mono text-[11px] text-foreground">
                    {o.orderNumber || o.id}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-foreground">
                    {(o.totalAmount ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {o.status}
                  </div>
                </div>
              </a>
            </li>
          ))}
          {items.length === 0 && (
            <li className="rounded-md border border-border bg-card px-3 py-4 text-center text-muted-foreground">
              暂无订单。
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

