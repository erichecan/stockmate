// Updated: 2026-03-18T23:41:40 - 订单页统一切换为正式 WMS 波次实体流程
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { authApi } from '@/lib/api';

type OrderItem = {
  skuId: string;
  quantity: number;
  sku?: { code?: string; product?: { name?: string | null } };
};

type SalesOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customer?: { name?: string | null };
  items?: OrderItem[];
};

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [creatingWave, setCreatingWave] = useState(false);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pickPreview, setPickPreview] = useState<any[]>([]);
  const [waveId, setWaveId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/sales-orders', {
        params: { page: 1, limit: 50 },
      });
      setOrders(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setOrders([]);
      toast.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedOrders = orders.filter((o) => selected[o.id]);

  const printOrders = () => {
    if (!selectedOrders.length) {
      toast.error('请先选择订单');
      return;
    }
    const html = `
      <html>
      <head><title>Order Print</title></head>
      <body>
        <h2>Orders (${new Date().toLocaleString()})</h2>
        ${selectedOrders
          .map(
            (o) => `
            <section style="margin-bottom:16px;border:1px solid #ddd;padding:8px;">
              <h3>${o.orderNumber}</h3>
              <p>Status: ${o.status} | Customer: ${o.customer?.name || '-'}</p>
              <ul>
                ${(o.items || [])
                  .map(
                    (it) =>
                      `<li>${it.sku?.code || it.skuId} - ${it.sku?.product?.name || ''} x ${it.quantity}</li>`,
                  )
                  .join('')}
              </ul>
            </section>
          `,
          )
          .join('')}
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const generateWavePickList = async () => {
    if (!selectedOrders.length) {
      toast.error('请先选择订单');
      return;
    }
    setCreatingWave(true);
    try {
      const createRes = await authApi.post('/wms/waves', {
        orderIds: selectedOrders.map((o) => o.id),
      });
      const createdWaveId = createRes.data?.id as string | undefined;
      if (!createdWaveId) {
        throw new Error('WMS wave id missing');
      }
      setWaveId(createdWaveId);

      const pickRes = await authApi.get(`/wms/waves/${createdWaveId}/pick-list`);
      const items = Array.isArray(pickRes.data?.items) ? pickRes.data.items : [];
      setPickPreview(items);
      setSelected({});
      toast.success(
        `已创建正式波次 ${createRes.data?.waveNumber || ''}，并生成拣货单`,
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '生成正式波次失败');
    } finally {
      setCreatingWave(false);
    }
  };

  const printPickList = () => {
    if (!pickPreview.length) {
      toast.error('请先生成拣货单');
      return;
    }
    const html = `
      <html>
      <head><title>Wave Pick List</title></head>
      <body>
        <h2>Wave Pick List (${new Date().toLocaleString()})</h2>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Bin</th><th>SKU</th><th>Name</th><th>Qty</th></tr></thead>
          <tbody>
            ${pickPreview
              .map(
                (it) =>
                  `<tr><td>${it.binCode || '-'}</td><td>${it.skuCode || '-'}</td><td>${it.skuName || '-'}</td><td>${it.quantity || 0}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Order Management</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        批发网站订单接收后，支持打印订单与生成波次拣货单。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={load}>
          刷新
        </Button>
        <Button variant="outline" onClick={printOrders}>
          打印订单
        </Button>
        <Button onClick={generateWavePickList} disabled={creatingWave}>
          {creatingWave ? '创建中...' : '生成拣货单（波次）'}
        </Button>
        <Button variant="outline" onClick={printPickList}>
          打印拣货单
        </Button>
        {waveId && (
          <Link href={`/admin/waves?waveId=${encodeURIComponent(waveId)}`}>
            <Button variant="outline">查看波次详情</Button>
          </Link>
        )}
      </div>
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
              暂无订单
            </p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={!!selected[o.id]}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({ ...prev, [o.id]: !!v }))
                      }
                    />
                    <div>
                      <div className="font-medium">{o.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString()} · {o.customer?.name || '-'}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{o.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pickPreview.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              拣货单预览 {waveId ? `(Wave: ${waveId.slice(0, 8)})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {pickPreview.slice(0, 100).map((it, idx) => (
                <li key={`${it.skuCode}-${idx}`} className="rounded border px-2 py-1">
                  {it.binCode || '-'} | {it.skuCode || '-'} | {it.skuName || '-'} x{' '}
                  {it.quantity || 0}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
