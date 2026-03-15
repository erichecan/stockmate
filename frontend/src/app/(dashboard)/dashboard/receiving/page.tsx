// 阶段二：收货 6 状态/6 Tab（参考 ModernWMS stockAsn）
// 2026-03-14

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  Truck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Package,
  Layers,
  Archive,
  ClipboardList,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { printWithTemplate } from '@/lib/print-document';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// ─── 阶段与 Tab 配置 ───────────────────────────────────────────────

const PHASES = [
  { key: 'NOTICE', label: '通知', icon: ClipboardList },
  { key: 'PENDING_ARRIVAL', label: '待到货', icon: Truck },
  { key: 'ARRIVED', label: '待卸货', icon: Package },
  { key: 'UNLOADED', label: '待分拣', icon: Layers },
  { key: 'SORTED', label: '待上架', icon: Archive },
  { key: 'COMPLETED', label: '到货明细', icon: CheckCircle2 },
] as const;

type PhaseKey = (typeof PHASES)[number]['key'];

// 后端 ReceiptStatus 与前端展示映射
const STATUS_LABELS: Record<string, string> = {
  PENDING: '待到货',
  PENDING_ARRIVAL: '待到货',
  IN_PROGRESS: '待卸货',
  ARRIVED: '待卸货',
  UNLOADED: '待分拣',
  SORTED: '待上架',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

// ─── 类型 ───────────────────────────────────────────────

interface ReceiptItemRow {
  id: string;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
  poItem: {
    id: string;
    skuId: string;
    sku: { id: string; code: string; product: { name: string } };
  };
}

interface PurchaseReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  status: string;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  purchaseOrder: {
    id: string;
    orderNumber: string;
    supplier: { id: string; name: string; code: string };
  };
  items: ReceiptItemRow[];
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

// ─── 工具 ───────────────────────────────────────────────

function formatDate(s: string | null | undefined): string {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(s);
  }
}

const PAGE_SIZE = 10;

// ─── 组件 ───────────────────────────────────────────────

export default function ReceivingPage() {
  const [activePhase, setActivePhase] = useState<PhaseKey>('NOTICE');
  const [data, setData] = useState<PurchaseReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 操作 loading
  const [confirmArrivalLoading, setConfirmArrivalLoading] = useState(false);
  const [confirmUnloadLoading, setConfirmUnloadLoading] = useState(false);
  const [sortingCompleteLoading, setSortingCompleteLoading] = useState(false);
  const [putawayDialogOpen, setPutawayDialogOpen] = useState(false);
  const [putawayReceipt, setPutawayReceipt] = useState<PurchaseReceipt | null>(null);
  const [putawayWarehouseId, setPutawayWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [putawaySubmitting, setPutawaySubmitting] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get('/purchasing/receipts/by-phase', {
        params: { phase: activePhase, page, limit: PAGE_SIZE },
      });
      setData(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch {
      toast.error('获取收货列表失败');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activePhase, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 切换 Tab 时重置页码
  useEffect(() => {
    setPage(1);
  }, [activePhase]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data: res } = await api.get('/warehouses');
      setWarehouses(Array.isArray(res) ? res : (res?.data ?? []));
    } catch {
      toast.error('获取仓库列表失败');
    }
  }, []);

  const handleConfirmArrival = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        setConfirmArrivalLoading(true);
        await api.put('/purchasing/receipts/confirm-arrival', { receiptIds: ids });
        toast.success('确认到货成功');
        await fetchList();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'response' in e && (e.response as { data?: { message?: string } })?.data?.message;
        toast.error(msg && typeof msg === 'string' ? msg : '确认到货失败');
      } finally {
        setConfirmArrivalLoading(false);
      }
    },
    [fetchList]
  );

  const handleConfirmUnload = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        setConfirmUnloadLoading(true);
        await api.put('/purchasing/receipts/confirm-unload', { receiptIds: ids });
        toast.success('确认卸货成功');
        await fetchList();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'response' in e && (e.response as { data?: { message?: string } })?.data?.message;
        toast.error(msg && typeof msg === 'string' ? msg : '确认卸货失败');
      } finally {
        setConfirmUnloadLoading(false);
      }
    },
    [fetchList]
  );

  const handleSortingComplete = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        setSortingCompleteLoading(true);
        await api.put('/purchasing/receipts/sorting-complete', { receiptIds: ids });
        toast.success('分拣完成');
        await fetchList();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'response' in e && (e.response as { data?: { message?: string } })?.data?.message;
        toast.error(msg && typeof msg === 'string' ? msg : '操作失败');
      } finally {
        setSortingCompleteLoading(false);
      }
    },
    [fetchList]
  );

  const [printingReceiptId, setPrintingReceiptId] = useState<string | null>(null);

  const handlePrintInbound = useCallback(
    async (row: PurchaseReceipt) => {
      setPrintingReceiptId(row.id);
      try {
        const itemsHtml = (row.items ?? [])
          .map(
            (item) =>
              `<tr><td>${item.poItem?.sku?.code ?? ''}</td><td>${item.poItem?.sku?.product?.name ?? '-'}</td><td>${item.receivedQty ?? item.expectedQty}</td></tr>`,
          )
          .join('');
        const totalQty = (row.items ?? []).reduce((s, i) => s + (i.receivedQty ?? i.expectedQty ?? 0), 0);
        const ok = await printWithTemplate(api, 'INBOUND_SHEET', {
          receiptNumber: row.receiptNumber,
          supplierName: row.purchaseOrder?.supplier?.name ?? '',
          receivedAt: formatDate(row.receivedAt ?? row.createdAt),
          items: itemsHtml,
          totalQty: String(totalQty),
        });
        if (!ok) toast.error('未配置入库单打印模板，请先在「打印方案」中创建');
      } finally {
        setPrintingReceiptId(null);
      }
    },
    [],
  );

  const openPutawayDialog = useCallback((receipt: PurchaseReceipt) => {
    setPutawayReceipt(receipt);
    setPutawayWarehouseId('');
    setPutawayDialogOpen(true);
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handlePutawaySubmit = useCallback(async () => {
    if (!putawayReceipt || !putawayWarehouseId) {
      toast.error('请选择目标仓库');
      return;
    }
    try {
      setPutawaySubmitting(true);
      await api.put(`/purchasing/receipts/${putawayReceipt.id}/putaway`, {
        warehouseId: putawayWarehouseId,
      });
      toast.success('上架完成，已入库');
      setPutawayDialogOpen(false);
      setPutawayReceipt(null);
      await fetchList();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e.response as { data?: { message?: string } })?.data?.message;
      toast.error(msg && typeof msg === 'string' ? msg : '上架失败');
    } finally {
      setPutawaySubmitting(false);
    }
  }, [putawayReceipt, putawayWarehouseId, fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  const canConfirmArrival = activePhase === 'PENDING_ARRIVAL' || activePhase === 'NOTICE';
  const canConfirmUnload = activePhase === 'ARRIVED' || activePhase === 'NOTICE';
  const canSortingComplete = activePhase === 'UNLOADED' || activePhase === 'NOTICE';
  const canPutaway = activePhase === 'SORTED' || activePhase === 'NOTICE';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <PackageCheck className="h-6 w-6" />
          采购收货
        </h1>
        <p className="text-muted-foreground">
          按到货流程：通知 → 待到货 → 待卸货 → 待分拣 → 待上架 → 到货明细
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>收货列表</CardTitle>
          <CardDescription>
            共 {total} 条，当前 Tab：{PHASES.find((p) => p.key === activePhase)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activePhase} onValueChange={(v) => setActivePhase(v as PhaseKey)}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {PHASES.map((p) => {
                const Icon = p.icon;
                return (
                  <TabsTrigger key={p.key} value={p.key} className="gap-1.5">
                    <Icon className="h-4 w-4" />
                    {p.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {PHASES.map((p) => (
              <TabsContent key={p.key} value={p.key} className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : data.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    暂无数据
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>收货单号</TableHead>
                          <TableHead>采购订单</TableHead>
                          <TableHead>供应商</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>到货时间</TableHead>
                          <TableHead>创建时间</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                {row.receiptNumber}
                              </code>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{row.purchaseOrder?.orderNumber ?? '-'}</span>
                            </TableCell>
                            <TableCell>
                              {row.purchaseOrder?.supplier?.name ?? '-'}
                              {row.purchaseOrder?.supplier?.code && (
                                <span className="ml-1 text-muted-foreground text-xs">
                                  ({row.purchaseOrder.supplier.code})
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {STATUS_LABELS[row.status] ?? row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(row.receivedAt)}</TableCell>
                            <TableCell>{formatDate(row.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mr-1"
                                disabled={printingReceiptId === row.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintInbound(row);
                                }}
                                title="打印入库单"
                              >
                                {printingReceiptId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Printer className="h-4 w-4" />
                                )}
                              </Button>
                              {(row.status === 'PENDING_ARRIVAL' || row.status === 'PENDING') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mr-1"
                                  disabled={confirmArrivalLoading}
                                  onClick={() => handleConfirmArrival([row.id])}
                                >
                                  {confirmArrivalLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    '确认到货'
                                  )}
                                </Button>
                              )}
                              {(row.status === 'ARRIVED' || row.status === 'IN_PROGRESS') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mr-1"
                                  disabled={confirmUnloadLoading}
                                  onClick={() => handleConfirmUnload([row.id])}
                                >
                                  {confirmUnloadLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    '确认卸货'
                                  )}
                                </Button>
                              )}
                              {row.status === 'UNLOADED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mr-1"
                                  disabled={sortingCompleteLoading}
                                  onClick={() => handleSortingComplete([row.id])}
                                >
                                  {sortingCompleteLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    '分拣完成'
                                  )}
                                </Button>
                              )}
                              {row.status === 'SORTED' && (
                                <Button
                                  size="sm"
                                  onClick={() => openPutawayDialog(row)}
                                >
                                  上架完成
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          显示 {startItem}-{endItem} / 共 {total} 条
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            上一页
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {page} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                          >
                            下一页
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 上架完成：选择仓库 */}
      <Dialog open={putawayDialogOpen} onOpenChange={setPutawayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上架完成</DialogTitle>
            <DialogDescription>
              选择目标仓库后，将按收货明细数量执行入库（调用库存入库接口）。收货单：{putawayReceipt?.receiptNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>目标仓库 *</Label>
              <Select value={putawayWarehouseId} onValueChange={setPutawayWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择仓库" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPutawayDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handlePutawaySubmit} disabled={!putawayWarehouseId || putawaySubmitting}>
              {putawaySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认上架
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
