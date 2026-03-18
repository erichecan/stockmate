// Updated: 2026-03-18T23:37:30 - 切换到正式 WMS 波次实体流程
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { authApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SalesOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customer?: { name?: string | null };
};

type WaveSummary = {
  id: string;
  waveNumber: string;
  status: string;
  totalOrders: number;
  createdAt: string;
};

export default function AdminWavesPage() {
  const [targetWaveId, setTargetWaveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedWaveId, setSelectedWaveId] = useState('');
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [waves, setWaves] = useState<WaveSummary[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pickItems, setPickItems] = useState<any[]>([]);
  const [selectedWaveStatus, setSelectedWaveStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [ordersRes, wavesRes] = await Promise.all([
        authApi.get('/sales-orders', {
          params: { page: 1, limit: 100 },
        }),
        authApi.get('/wms/waves', {
          params: { page: 1, limit: 50 },
        }),
      ]);
      const all = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [];
      const candidates = all.filter((o: SalesOrder) =>
        ['PENDING', 'CONFIRMED', 'PICKING', 'PACKED'].includes(o.status),
      );
      setOrders(candidates);
      setWaves(Array.isArray(wavesRes.data?.data) ? wavesRes.data.data : []);
    } catch {
      setOrders([]);
      setWaves([]);
      toast.error('加载波次候选订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const search = window.location.search || '';
    const params = new URLSearchParams(search);
    const waveId = params.get('waveId') || '';
    if (waveId) {
      setTargetWaveId(waveId);
    }
  }, []);

  useEffect(() => {
    if (!targetWaveId) return;
    setSelectedWaveId(targetWaveId);
    loadWavePickList(targetWaveId);
  }, [targetWaveId]);

  const selectedOrders = orders.filter((o) => selected[o.id]);

  const buildWave = async () => {
    if (!selectedOrders.length) {
      toast.error('请先勾选订单');
      return;
    }
    setCreating(true);
    try {
      const { data } = await authApi.post('/wms/waves', {
        orderIds: selectedOrders.map((o) => o.id),
      });
      const waveId = data?.id;
      if (waveId) {
        setSelectedWaveId(waveId);
        await loadWavePickList(waveId);
      }
      toast.success(`波次已创建：${data?.waveNumber || ''}`);
      setSelected({});
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '生成波次失败');
    } finally {
      setCreating(false);
    }
  };

  const loadWavePickList = async (waveId: string) => {
    if (!waveId) return;
    try {
      const [{ data: pickData }, { data: waveDetail }] = await Promise.all([
        authApi.get(`/wms/waves/${waveId}/pick-list`),
        authApi.get(`/wms/waves/${waveId}`),
      ]);
      setPickItems(Array.isArray(pickData?.items) ? pickData.items : []);
      setSelectedWaveStatus(waveDetail?.status || '');
    } catch {
      setPickItems([]);
      setSelectedWaveStatus('');
      toast.error('加载波次拣货单失败');
    }
  };

  const updateWaveStatus = async () => {
    if (!selectedWaveId || !selectedWaveStatus) {
      toast.error('请先选择波次并设置状态');
      return;
    }
    setUpdatingStatus(true);
    try {
      await authApi.patch(`/wms/waves/${selectedWaveId}/status`, {
        status: selectedWaveStatus,
      });
      toast.success('波次状态已更新');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '状态更新失败');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const printWave = () => {
    if (!pickItems.length) {
      toast.error('请先生成波次');
      return;
    }
    const html = `
      <html><head><title>Wave Pick List</title></head><body>
      <h2>Wave Pick List (${new Date().toLocaleString()})</h2>
      <table border="1" cellspacing="0" cellpadding="6">
      <thead><tr><th>Bin</th><th>SKU</th><th>Name</th><th>Qty</th></tr></thead>
      <tbody>
        ${pickItems
          .map(
            (it) =>
              `<tr><td>${it.binCode}</td><td>${it.skuCode}</td><td>${it.skuName}</td><td>${it.quantity}</td></tr>`,
          )
          .join('')}
      </tbody>
      </table></body></html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pick Waves</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        正式 WMS 波次流程：选择订单创建波次实体、查询波次、打印拣货单、更新波次状态。
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={load}>
          刷新
        </Button>
        <Button onClick={buildWave} disabled={creating}>
          {creating ? '创建中...' : '创建波次'}
        </Button>
        <Button variant="outline" onClick={printWave}>
          打印波次拣货单
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">波次列表</CardTitle>
        </CardHeader>
        <CardContent>
          {waves.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无波次</p>
          ) : (
            <div className="space-y-2">
              {waves.map((wave) => (
                <button
                  type="button"
                  key={wave.id}
                  onClick={() => {
                    setSelectedWaveId(wave.id);
                    setSelectedWaveStatus(wave.status);
                    loadWavePickList(wave.id);
                  }}
                  className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                    selectedWaveId === wave.id ? 'bg-accent' : 'hover:bg-accent/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{wave.waveNumber}</span>
                    <Badge variant="outline">{wave.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Orders: {wave.totalOrders} ·{' '}
                    {new Date(wave.createdAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="w-56">
              <Select
                value={selectedWaveStatus}
                onValueChange={setSelectedWaveStatus}
                disabled={!selectedWaveId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={updateWaveStatus}
              disabled={!selectedWaveId || updatingStatus}
            >
              {updatingStatus ? '更新中...' : '更新波次状态'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">候选订单</CardTitle>
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
              当前无可波次处理订单
            </p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={!!selected[o.id]}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({ ...prev, [o.id]: !!v }))
                      }
                    />
                    <span className="font-medium">{o.orderNumber}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {o.status} · {o.customer?.name || '-'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pickItems.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              波次拣货单预览 {selectedWaveId ? `(${selectedWaveId.slice(0, 8)})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {pickItems.map((it, idx) => (
                <li key={`${it.skuCode}-${idx}`} className="rounded border px-2 py-1">
                  {it.binCode} | {it.skuCode} | {it.skuName} x {it.quantity}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
