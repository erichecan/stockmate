// Updated: 2026-03-14T18:35:00 - 批发站 P0: 订单详情页（调用 /wholesale/orders/:id）
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type OrderDetailPageProps = {
  params: { id: string };
};

type OrderItemLine = {
  id: string;
  quantity: number;
  unitPrice: number;
  sku: { code: string };
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  totalAmount?: number;
  status: string;
  createdAt: string;
  items: OrderItemLine[];
};

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = params;
  const [data, setData] = useState<OrderDetail | null>(null);
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
          setError('请先登录后再查看订单详情。');
          setData(null);
          return;
        }
        const res = await api.get(`/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data || null);
      } catch {
        setError('加载订单详情失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">订单详情（/orders/{id}）</h2>
      {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && data && (
        <div className="space-y-3 rounded-md border bg-card p-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[11px]">
                {data.orderNumber || data.id}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(data.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold">
                {(data.totalAmount ?? 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {data.status}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold">订单行</div>
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b text-[10px] text-muted-foreground">
                  <th className="py-1">SKU</th>
                  <th className="py-1">数量</th>
                  <th className="py-1">单价</th>
                  <th className="py-1">小计</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="py-1 font-mono">{it.sku.code}</td>
                    <td className="py-1">{it.quantity}</td>
                    <td className="py-1">{it.unitPrice.toFixed(2)}</td>
                    <td className="py-1">
                      {(it.unitPrice * it.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-2 text-center text-[11px] text-muted-foreground"
                    >
                      暂无订单行。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

