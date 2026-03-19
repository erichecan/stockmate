// Updated: 2026-03-19T00:44:49-0400 - 清理 any 类型并提升类型安全
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

type ShipmentItemStock = {
  skuCode: string;
  skuName: string | null;
  quantity: number;
  availableStock: number;
};

type ShipmentItemsWithStockResponse = {
  shipment?: unknown;
  items?: ShipmentItemStock[];
};

type ShipmentSummary = {
  id: string;
  containerNo?: string | null;
  vesselName?: string | null;
  eta?: string | null;
  status: string;
};

// Updated: 2026-03-19T00:44:49-0400 - 类型守卫用于安全解析 API 错误响应
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown): string {
  if (!isRecord(error)) return '状态更新失败';
  const response = error.response;
  if (!isRecord(response)) return '状态更新失败';
  const data = response.data;
  if (!isRecord(data)) return '状态更新失败';
  const message = data.message;
  return typeof message === 'string' && message.length > 0
    ? message
    : '状态更新失败';
}

const STATUS_OPTIONS = [
  'PENDING',
  'LOADING',
  'LOADED',
  'IN_TRANSIT',
  'ARRIVED_PORT',
  'AT_WAREHOUSE_PENDING_UNLOAD',
  'UNLOADING_COUNTING_RECEIVING',
  'ARRIVED',
  'RECEIVING',
  'DELIVERED',
  'COMPLETED',
];

export default function AdminShipmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [shipment, setShipment] = useState<ShipmentSummary | null>(null);
  const [itemsWithStock, setItemsWithStock] = useState<ShipmentItemStock[]>([]);
  const [status, setStatus] = useState<string>('');

  // Updated: 2026-03-19T00:47:47-0400 - 使用 useCallback 稳定 load 引用，消除 useEffect 依赖告警
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shipmentRes, itemsRes] = await Promise.all([
        authApi.get('/purchasing/shipments', { params: { purchaseOrderId: undefined } }),
        authApi.get(`/purchasing/shipments/${id}/items-with-stock`),
      ]);
      const shipments = Array.isArray(shipmentRes.data)
        ? (shipmentRes.data as ShipmentSummary[])
        : [];
      const current = shipments.find((s) => s.id === id) || null;
      setShipment(current);
      setStatus(current?.status || '');
      // Updated: 2026-03-19T00:41:46-0400 - 修复接口响应结构解析，正确读取 packing list items
      const itemsPayload = (itemsRes.data ?? {}) as ShipmentItemsWithStockResponse;
      setItemsWithStock(Array.isArray(itemsPayload.items) ? itemsPayload.items : []);
    } catch {
      setShipment(null);
      setItemsWithStock([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const patchStatus = async () => {
    if (!status) return;
    setUpdating(true);
    try {
      await authApi.patch(`/purchasing/shipments/${id}/status`, { status });
      toast.success('状态已更新');
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6">
      <Link
        href="/admin/shipments"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shipments
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        Shipment {id.slice(0, 8)}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        展示当前货柜状态与相关 SKU 库存，辅助“马上没货”预警。
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
            </div>
          ) : shipment ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Container: {shipment.containerNo || '-'}</Badge>
                <Badge variant="outline">Vessel: {shipment.vesselName || '-'}</Badge>
                <Badge variant="outline">
                  ETA: {shipment.eta ? new Date(shipment.eta).toLocaleDateString() : '-'}
                </Badge>
                <Badge>{shipment.status}</Badge>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-64">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={patchStatus} disabled={updating || !status}>
                  {updating ? '更新中...' : '更新状态'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Shipment not found
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">货柜 SKU 与当前库存</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : itemsWithStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无 packing list 数据</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {itemsWithStock.map((item, idx) => {
                const risk =
                  item.availableStock <= 0
                    ? '无库存'
                    : item.availableStock < Math.max(5, Math.ceil(item.quantity * 0.1))
                      ? '库存偏低'
                      : '库存正常';
                return (
                  <li key={`${item.skuCode}-${idx}`} className="rounded border px-3 py-2">
                    <div className="font-medium">
                      {item.skuCode} - {item.skuName || '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      票货数量: {item.quantity} · 当前可用库存: {item.availableStock} · {risk}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
