'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';

type WaveStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type WaveItem = {
  id: string;
  waveNumber: string;
  status: WaveStatus;
  totalOrders: number;
  createdAt: string;
};

type PickItem = {
  binCode?: string;
  skuCode?: string;
  skuName?: string;
  totalQty?: number;
  shortage?: boolean;
};

export default function AdminWarehouseWavesPage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [waves, setWaves] = useState<WaveItem[]>([]);
  const [selectedWaveId, setSelectedWaveId] = useState('');
  const [pickItems, setPickItems] = useState<PickItem[]>([]);
  const [selectedWaveStatus, setSelectedWaveStatus] = useState<WaveStatus | ''>('');

  const activeWaves = useMemo(
    () => waves.filter((w) => w.status === 'PENDING' || w.status === 'IN_PROGRESS'),
    [waves],
  );

  const selectedWave = useMemo(
    () => waves.find((w) => w.id === selectedWaveId) || null,
    [waves, selectedWaveId],
  );

  const shortageCount = useMemo(
    () => pickItems.filter((item) => item.shortage).length,
    [pickItems],
  );

  const loadWaves = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/wms/waves', {
        params: { page: 1, limit: 100 },
      });
      const list = Array.isArray(data?.data) ? (data.data as WaveItem[]) : [];
      setWaves(list);
      if (!selectedWaveId && list.length > 0) {
        const firstActive = list.find(
          (w) => w.status === 'PENDING' || w.status === 'IN_PROGRESS',
        );
        const first = firstActive || list[0];
        setSelectedWaveId(first.id);
        setSelectedWaveStatus(first.status);
      }
    } catch {
      setWaves([]);
      toast.error('加载仓库波次看板失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPickList = async (waveId: string) => {
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
  };

  // Updated: 2026-03-19T11:44:15 - 仓库看板初始化加载并默认聚焦首个待处理波次
  useEffect(() => {
    loadWaves();
  }, []);

  useEffect(() => {
    if (!selectedWaveId) return;
    loadPickList(selectedWaveId);
  }, [selectedWaveId]);

  const updateStatus = async (status: WaveStatus) => {
    if (!selectedWaveId) {
      toast.error('请先选择一个波次');
      return;
    }
    setUpdating(true);
    try {
      await authApi.patch(`/wms/waves/${selectedWaveId}/status`, { status });
      toast.success(`波次状态已更新为 ${status}`);
      setSelectedWaveStatus(status);
      await loadWaves();
      await loadPickList(selectedWaveId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '更新波次状态失败');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Warehouse Waves Board</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        仓库专用波次看板：聚焦待拣货/拣货中波次，支持快速推进状态并查看缺货项。
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={loadWaves}>
          刷新
        </Button>
        <Button
          onClick={() => updateStatus('IN_PROGRESS')}
          disabled={updating || !selectedWaveId || selectedWaveStatus === 'IN_PROGRESS'}
        >
          开始拣货
        </Button>
        <Button
          variant="outline"
          onClick={() => updateStatus('COMPLETED')}
          disabled={updating || !selectedWaveId || selectedWaveStatus === 'COMPLETED'}
        >
          完成波次
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">待处理波次</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : activeWaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">当前没有待处理波次</p>
            ) : (
              <ul className="space-y-2">
                {activeWaves.map((wave) => (
                  <li key={wave.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWaveId(wave.id);
                        setSelectedWaveStatus(wave.status);
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
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              波次拣货单 {selectedWave ? `- ${selectedWave.waveNumber}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedWaveId ? (
              <p className="text-sm text-muted-foreground">请先选择左侧波次</p>
            ) : pickItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">该波次暂无拣货项</p>
            ) : (
              <>
                <div className="mb-3 text-sm text-muted-foreground">
                  当前状态：<span className="font-medium text-foreground">{selectedWaveStatus || '-'}</span>
                  {' · '}
                  缺货项：<span className="font-medium text-foreground">{shortageCount}</span>
                </div>
                <ul className="space-y-1 text-sm">
                  {pickItems.slice(0, 300).map((item, idx) => (
                    <li
                      key={`${item.skuCode || 'sku'}-${idx}`}
                      className="rounded border px-2 py-1"
                    >
                      {item.binCode || '-'} | {item.skuCode || '-'} | {item.skuName || '-'} x{' '}
                      {item.shortage ? '缺货' : (item.totalQty ?? 0)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
