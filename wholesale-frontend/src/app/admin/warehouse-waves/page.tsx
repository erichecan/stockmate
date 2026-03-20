// Updated: 2026-03-20T08:02:38-0400 - 波次列表默认「全部」，避免仅待处理为空时误判无数据
'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authApi } from '@/lib/api';

type WaveStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type WaveItem = {
  id: string;
  waveNumber: string;
  status: WaveStatus;
  totalOrders: number;
  createdAt: string;
};

type SalesOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customer?: { name?: string | null };
};

type PickItem = {
  binCode?: string;
  skuCode?: string;
  skuName?: string;
  totalQty?: number;
  shortage?: boolean;
};

type PickingSummary = {
  pendingOrdersCount: number;
  pendingWavesCount: number;
  shortageItemsCount: number;
};

const WAVE_ELIGIBLE_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PICKING',
  'PACKED',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error)) return fallback;
  const response = error.response;
  if (!isRecord(response)) return fallback;
  const data = response.data;
  if (!isRecord(data)) return fallback;
  const message = data.message;
  return typeof message === 'string' && message.length > 0 ? message : fallback;
}

function WarehousePickingBoardContent() {
  const searchParams = useSearchParams();
  const waveIdFromUrl = searchParams.get('waveId');

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingStatusSelect, setUpdatingStatusSelect] = useState(false);

  const [summary, setSummary] = useState<PickingSummary>({
    pendingOrdersCount: 0,
    pendingWavesCount: 0,
    shortageItemsCount: 0,
  });

  const [waves, setWaves] = useState<WaveItem[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [selectedWaveId, setSelectedWaveId] = useState('');
  const [selectedWaveStatus, setSelectedWaveStatus] = useState<WaveStatus | ''>('');
  const [pickItems, setPickItems] = useState<PickItem[]>([]);
  // Updated: 2026-03-20T08:02:38-0400 - 默认「全部」避免仅待处理时列表为空误以为无数据
  const [waveListFilter, setWaveListFilter] = useState<'active' | 'all'>('all');

  const activeWaves = useMemo(
    () => waves.filter((w) => w.status === 'PENDING' || w.status === 'IN_PROGRESS'),
    [waves],
  );

  const displayedWaves = useMemo(
    () => (waveListFilter === 'active' ? activeWaves : waves),
    [waveListFilter, activeWaves, waves],
  );

  const selectedWave = useMemo(
    () => waves.find((w) => w.id === selectedWaveId) || null,
    [waves, selectedWaveId],
  );

  const selectedWaveShortageCount = useMemo(
    () => pickItems.filter((item) => item.shortage).length,
    [pickItems],
  );

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const { data } = await authApi.get('/wms/waves/picking-summary');
      const payload = (data ?? {}) as Partial<PickingSummary>;
      setSummary({
        pendingOrdersCount: Number(payload.pendingOrdersCount) || 0,
        pendingWavesCount: Number(payload.pendingWavesCount) || 0,
        shortageItemsCount: Number(payload.shortageItemsCount) || 0,
      });
    } catch {
      toast.error('加载拣货看板指标失败');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadPickList = useCallback(async (waveId: string) => {
    if (!waveId) return;
    try {
      const [{ data: pickData }, { data: waveDetail }] = await Promise.all([
        authApi.get(`/wms/waves/${waveId}/pick-list`),
        authApi.get(`/wms/waves/${waveId}`),
      ]);
      setPickItems(Array.isArray(pickData?.items) ? pickData.items : []);
      setSelectedWaveStatus((waveDetail?.status || '') as WaveStatus | '');
    } catch {
      setPickItems([]);
      setSelectedWaveStatus('');
      toast.error('加载波次拣货单失败');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, wavesRes] = await Promise.all([
        authApi.get('/sales-orders', { params: { page: 1, limit: 100 } }),
        authApi.get('/wms/waves', { params: { page: 1, limit: 100 } }),
      ]);
      const allOrders = Array.isArray(ordersRes.data?.data)
        ? (ordersRes.data.data as SalesOrder[])
        : [];
      const candidates = allOrders.filter((o) =>
        WAVE_ELIGIBLE_STATUSES.includes(o.status as (typeof WAVE_ELIGIBLE_STATUSES)[number]),
      );
      setOrders(candidates);
      const list = Array.isArray(wavesRes.data?.data)
        ? (wavesRes.data.data as WaveItem[])
        : [];
      setWaves(list);
    } catch {
      setOrders([]);
      setWaves([]);
      toast.error('加载拣货看板数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadSummary(), loadAll()]);
  }, [loadSummary, loadAll]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!waveIdFromUrl) return;
    setSelectedWaveId(waveIdFromUrl);
  }, [waveIdFromUrl]);

  useEffect(() => {
    if (waveIdFromUrl) return;
    if (selectedWaveId) return;
    if (waves.length === 0) return;
    const firstActive = waves.find(
      (w) => w.status === 'PENDING' || w.status === 'IN_PROGRESS',
    );
    const first = firstActive || waves[0];
    setSelectedWaveId(first.id);
    setSelectedWaveStatus(first.status);
  }, [waves, selectedWaveId, waveIdFromUrl]);

  useEffect(() => {
    if (!selectedWaveId) return;
    void loadPickList(selectedWaveId);
  }, [selectedWaveId, loadPickList]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected[o.id]),
    [orders, selected],
  );

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
      const newId = data?.id as string | undefined;
      if (newId) {
        setSelectedWaveId(newId);
        setWaveListFilter('active');
        await loadPickList(newId);
      }
      toast.success(`波次已创建：${data?.waveNumber || ''}`);
      setSelected({});
      await refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '生成波次失败'));
    } finally {
      setCreating(false);
    }
  };

  const updateQuickStatus = async (status: WaveStatus) => {
    if (!selectedWaveId) {
      toast.error('请先选择一个波次');
      return;
    }
    setUpdating(true);
    try {
      await authApi.patch(`/wms/waves/${selectedWaveId}/status`, { status });
      toast.success(`波次状态已更新为 ${status}`);
      setSelectedWaveStatus(status);
      await refresh();
      await loadPickList(selectedWaveId);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '更新波次状态失败'));
    } finally {
      setUpdating(false);
    }
  };

  const updateStatusFromSelect = async () => {
    if (!selectedWaveId || !selectedWaveStatus) {
      toast.error('请先选择波次并设置状态');
      return;
    }
    setUpdatingStatusSelect(true);
    try {
      await authApi.patch(`/wms/waves/${selectedWaveId}/status`, {
        status: selectedWaveStatus,
      });
      toast.success('波次状态已更新');
      await refresh();
      await loadPickList(selectedWaveId);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '状态更新失败'));
    } finally {
      setUpdatingStatusSelect(false);
    }
  };

  const printWave = () => {
    if (!pickItems.length) {
      toast.error('请先生成或选择有拣货明细的波次');
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
              `<tr><td>${it.binCode || '-'}</td><td>${it.skuCode || '-'}</td><td>${it.skuName || '-'}</td><td>${it.shortage ? '缺货' : (it.totalQty ?? 0)}</td></tr>`,
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

  const selectWave = (wave: WaveItem) => {
    setSelectedWaveId(wave.id);
    setSelectedWaveStatus(wave.status);
    void loadPickList(wave.id);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">仓库拣货看板</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        合并波次列表与拣货明细：创建波次、推进状态、查看缺货与打印拣货单。
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              待处理订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summaryLoading ? '—' : summary.pendingOrdersCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              状态含 PENDING / CONFIRMED / PICKING / PACKED
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              待处理波次
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summaryLoading ? '—' : summary.pendingWavesCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PENDING + IN_PROGRESS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              缺货项（行）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summaryLoading ? '—' : summary.shortageItemsCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              待处理波次内未分配库位的拣货行
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void refresh()}>
          刷新
        </Button>
        <Button onClick={buildWave} disabled={creating}>
          {creating ? '创建中...' : '创建波次'}
        </Button>
        <Button variant="outline" onClick={printWave}>
          打印拣货单
        </Button>
        <Button
          onClick={() => void updateQuickStatus('IN_PROGRESS')}
          disabled={updating || !selectedWaveId || selectedWaveStatus === 'IN_PROGRESS'}
        >
          开始拣货
        </Button>
        <Button
          variant="outline"
          onClick={() => void updateQuickStatus('COMPLETED')}
          disabled={updating || !selectedWaveId || selectedWaveStatus === 'COMPLETED'}
        >
          完成波次
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">波次</CardTitle>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={waveListFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setWaveListFilter('active')}
              >
                待处理
              </Button>
              <Button
                type="button"
                size="sm"
                variant={waveListFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setWaveListFilter('all')}
              >
                全部
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : displayedWaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无波次</p>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                {displayedWaves.map((wave) => (
                  <li key={wave.id}>
                    <button
                      type="button"
                      onClick={() => selectWave(wave)}
                      className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                        selectedWaveId === wave.id ? 'bg-accent' : 'hover:bg-accent/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{wave.waveNumber}</span>
                        <Badge variant="outline">{wave.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        订单数 {wave.totalOrders} ·{' '}
                        {new Date(wave.createdAt).toLocaleString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
              <div className="min-w-[10rem] flex-1">
                <Select
                  value={selectedWaveStatus}
                  onValueChange={(v) => setSelectedWaveStatus(v as WaveStatus)}
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
                size="sm"
                onClick={() => void updateStatusFromSelect()}
                disabled={!selectedWaveId || updatingStatusSelect}
              >
                {updatingStatusSelect ? '更新中...' : '更新状态'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              拣货单（波次详情）{selectedWave ? `· ${selectedWave.waveNumber}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedWaveId ? (
              <p className="text-sm text-muted-foreground">请从左侧选择一个波次</p>
            ) : pickItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">该波次暂无拣货项</p>
            ) : (
              <>
                <div className="mb-3 text-sm text-muted-foreground">
                  当前状态：
                  <span className="font-medium text-foreground">
                    {selectedWaveStatus || '-'}
                  </span>
                  {' · '}
                  本波次缺货行：
                  <span className="font-medium text-foreground">
                    {selectedWaveShortageCount}
                  </span>
                </div>
                <ul className="max-h-[min(60vh,520px)] space-y-1 overflow-y-auto text-sm">
                  {pickItems.slice(0, 500).map((item, idx) => (
                    <li
                      key={`${item.skuCode || 'sku'}-${idx}`}
                      className="rounded border px-2 py-1"
                    >
                      {item.binCode || '-'} | {item.skuCode || '-'} | {item.skuName || '-'}{' '}
                      x {item.shortage ? '缺货' : (item.totalQty ?? 0)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">候选订单（勾选后创建波次）</CardTitle>
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
    </div>
  );
}

export default function AdminWarehousePickingBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">加载拣货看板…</div>
      }
    >
      <WarehousePickingBoardContent />
    </Suspense>
  );
}
