// Phase 3: 销售订单管理页面
// Updated: 2026-02-28T14:30:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ─── Interfaces ───────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  code: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Sku {
  id: string;
  code: string;
  product: { name: string } | null;
  wholesalePrice: string | null;
}

interface SOItem {
  id: string;
  skuId: string;
  sku: { id: string; code: string; product: { name: string } | null };
  quantity: number;
  unitPrice: string;
  pickedQty: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  customer: { id: string; name: string; code: string };
  warehouse: { id: string; name: string; code: string };
  status: string;
  totalAmount: string | null;
  currency: string;
  notes: string | null;
  items: SOItem[];
  createdAt: string;
  shippedAt: string | null;
}

interface CreateSOItem {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
}

interface PickListItem {
  binCode: string;
  skuCode: string;
  skuName: string;
  quantity: number;
}

// ─── Helpers ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  PICKING: '拣货中',
  PACKED: '已打包',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

function formatDate(s: string | null | undefined): string {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return s;
  }
}

const PAGE_SIZE = 10;

// ─── Component ───────────────────────────────────────────

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [createCustomerId, setCreateCustomerId] = useState('');
  const [createWarehouseId, setCreateWarehouseId] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createItems, setCreateItems] = useState<CreateSOItem[]>([]);
  const [skuSearchOpen, setSkuSearchOpen] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [skuSearchResults, setSkuSearchResults] = useState<Sku[]>([]);
  const [skuSearchLoading, setSkuSearchLoading] = useState(false);

  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pickListOpen, setPickListOpen] = useState(false);
  const [pickListData, setPickListData] = useState<{
    orderNumber: string;
    warehouseName: string;
    items: PickListItem[];
  } | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/sales-orders', {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(statusFilter && { status: statusFilter }),
        },
      });
      setOrders(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('获取销售订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenCreate = useCallback(async () => {
    setCreateCustomerId('');
    setCreateWarehouseId('');
    setCreateNotes('');
    setCreateItems([]);
    setCreateDialogOpen(true);
    try {
      const [custRes, whRes] = await Promise.all([
        api.get('/customers', { params: { page: 1, limit: 200 } }),
        api.get('/warehouses'),
      ]);
      setCustomers(custRes.data?.data ?? []);
      setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
    } catch {
      toast.error('加载客户和仓库失败');
    }
  }, []);

  const searchSkus = useCallback(async () => {
    if (!skuSearchQuery.trim()) return;
    try {
      setSkuSearchLoading(true);
      const { data } = await api.get('/skus', {
        params: { page: 1, limit: 30, search: skuSearchQuery },
      });
      setSkuSearchResults(data.data ?? []);
    } catch {
      setSkuSearchResults([]);
    } finally {
      setSkuSearchLoading(false);
    }
  }, [skuSearchQuery]);

  useEffect(() => {
    const t = setTimeout(searchSkus, 300);
    return () => clearTimeout(t);
  }, [skuSearchQuery, searchSkus]);

  const handleAddItem = useCallback((sku: Sku) => {
    setCreateItems((prev) => {
      const idx = prev.findIndex((i) => i.skuId === sku.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [
        ...prev,
        {
          skuId: sku.id,
          skuCode: sku.code,
          productName: sku.product?.name ?? sku.code,
          quantity: 1,
        },
      ];
    });
    setSkuSearchOpen(false);
    setSkuSearchQuery('');
  }, []);

  const handleRemoveItem = useCallback((idx: number) => {
    setCreateItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCreateSO = useCallback(async () => {
    if (!createCustomerId.trim()) {
      toast.error('请选择客户');
      return;
    }
    if (!createWarehouseId.trim()) {
      toast.error('请选择发货仓库');
      return;
    }
    if (createItems.length === 0) {
      toast.error('请至少添加一个商品');
      return;
    }
    try {
      setCreateSubmitting(true);
      await api.post('/sales-orders', {
        customerId: createCustomerId,
        warehouseId: createWarehouseId,
        currency: 'EUR',
        notes: createNotes.trim() || undefined,
        items: createItems.map((i) => ({ skuId: i.skuId, quantity: i.quantity })),
      });
      toast.success('销售订单创建成功');
      setCreateDialogOpen(false);
      await fetchOrders();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '创建失败，请重试';
      toast.error(msg);
    } finally {
      setCreateSubmitting(false);
    }
  }, [createCustomerId, createWarehouseId, createNotes, createItems, fetchOrders]);

  const handleOpenDetail = useCallback(async (so: SalesOrder) => {
    setSelectedSO(so);
    setDetailSheetOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/sales-orders/${so.id}`);
      setSelectedSO(data);
    } catch {
      toast.error('获取订单详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedSO) return;
    try {
      setActionLoading(true);
      await api.post(`/sales-orders/${selectedSO.id}/confirm`);
      toast.success('订单已确认，库存已锁定');
      const { data } = await api.get(`/sales-orders/${selectedSO.id}`);
      setSelectedSO(data);
      await fetchOrders();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '确认失败');
    } finally {
      setActionLoading(false);
    }
  }, [selectedSO, fetchOrders]);

  const handleCancel = useCallback(async () => {
    if (!selectedSO) return;
    try {
      setActionLoading(true);
      await api.post(`/sales-orders/${selectedSO.id}/cancel`);
      toast.success('订单已取消');
      setDetailSheetOpen(false);
      await fetchOrders();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '取消失败');
    } finally {
      setActionLoading(false);
    }
  }, [selectedSO, fetchOrders]);

  const handleOpenPickList = useCallback(async () => {
    if (!selectedSO) return;
    try {
      const { data } = await api.get(`/sales-orders/${selectedSO.id}/pick-list`);
      setPickListData({
        orderNumber: data.orderNumber,
        warehouseName: data.warehouseName,
        items: data.items ?? [],
      });
      setPickListOpen(true);
    } catch {
      toast.error('获取拣货单失败');
    }
  }, [selectedSO]);

  const handleFulfill = useCallback(async () => {
    if (!selectedSO) return;
    try {
      setActionLoading(true);
      await api.post(`/sales-orders/${selectedSO.id}/fulfill`);
      toast.success('订单已出库完成');
      setDetailSheetOpen(false);
      await fetchOrders();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '出库失败');
    } finally {
      setActionLoading(false);
    }
  }, [selectedSO, fetchOrders]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6" />
            销售订单管理
          </h1>
          <p className="text-muted-foreground">
            管理批发销售订单，确认、拣货、出库
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建销售订单
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>销售订单列表</CardTitle>
              <CardDescription>共 {total} 个订单</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) => {
                  setStatusFilter(v === 'all' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">暂无销售订单</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击「新建销售订单」创建第一个订单
              </p>
              <Button onClick={handleOpenCreate} className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                新建销售订单
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO编号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>发货仓库</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">总金额</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((so) => (
                    <TableRow
                      key={so.id}
                      className="cursor-pointer"
                      onClick={() => handleOpenDetail(so)}
                    >
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {so.orderNumber}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{so.customer?.name ?? '-'}</span>
                        {so.customer?.code && (
                          <span className="ml-1 text-muted-foreground text-xs">
                            ({so.customer.code})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{so.warehouse?.name ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABELS[so.status] ?? so.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {so.totalAmount != null ? so.totalAmount : '-'} {so.currency}
                      </TableCell>
                      <TableCell>{formatDate(so.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(so);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">查看</span>
                        </Button>
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
        </CardContent>
      </Card>

      {/* Create SO Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建销售订单</DialogTitle>
            <DialogDescription>
              选择客户、发货仓库并添加商品（单价按客户等级自动计算）
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4 pr-1">
            <div className="grid gap-2">
              <Label>客户 *</Label>
              <Select value={createCustomerId} onValueChange={setCreateCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>发货仓库 *</Label>
              <Select value={createWarehouseId} onValueChange={setCreateWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择仓库" />
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

            <div className="grid gap-2">
              <Label>备注</Label>
              <Input
                placeholder="可选"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>添加商品</Label>
              <Popover open={skuSearchOpen} onOpenChange={setSkuSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    搜索 SKU 编码或产品名称...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="输入搜索..."
                      value={skuSearchQuery}
                      onValueChange={setSkuSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {skuSearchLoading ? '加载中...' : '暂无结果'}
                      </CommandEmpty>
                      <CommandGroup>
                        {skuSearchResults.map((sku) => (
                          <CommandItem
                            key={sku.id}
                            onSelect={() => handleAddItem(sku)}
                          >
                            <span className="font-mono">{sku.code}</span>
                            <span className="ml-2 text-muted-foreground">
                              {sku.product?.name ?? ''}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {createItems.length > 0 && (
                <div className="mt-2 space-y-2">
                  {createItems.map((item, idx) => (
                    <div
                      key={`${item.skuId}-${idx}`}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <div>
                        <span className="font-mono text-sm">{item.skuCode}</span>
                        <span className="ml-2 text-muted-foreground text-sm">
                          {item.productName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v) && v >= 1) {
                              setCreateItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], quantity: v };
                                return next;
                              });
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={createSubmitting}>
              取消
            </Button>
            <Button onClick={handleCreateSO} disabled={createSubmitting}>
              {createSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              创建订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SO Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              订单详情
              {selectedSO && (
                <code className="ml-2 rounded bg-muted px-1.5 py-0.5 text-sm font-normal">
                  {selectedSO.orderNumber}
                </code>
              )}
            </SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedSO ? (
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">客户</p>
                <p className="font-medium">{selectedSO.customer?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedSO.customer?.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">发货仓库</p>
                <p className="font-medium">{selectedSO.warehouse?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">状态</p>
                <Badge variant="outline">{STATUS_LABELS[selectedSO.status] ?? selectedSO.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总金额</p>
                <p className="font-medium">
                  {selectedSO.totalAmount ?? '-'} {selectedSO.currency}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">订单明细</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>产品</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSO.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.sku.code}</TableCell>
                        <TableCell>{item.sku.product?.name ?? '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.unitPrice}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {(selectedSO.status === 'PENDING' ||
                selectedSO.status === 'CONFIRMED' ||
                selectedSO.status === 'PICKING' ||
                selectedSO.status === 'PACKED') && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedSO.status === 'PENDING' && (
                    <Button onClick={handleConfirm} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      确认订单
                    </Button>
                  )}
                  {(selectedSO.status === 'PENDING' || selectedSO.status === 'CONFIRMED') && (
                    <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
                      <XCircle className="mr-1.5 h-4 w-4" />
                      取消订单
                    </Button>
                  )}
                  {(selectedSO.status === 'CONFIRMED' || selectedSO.status === 'PICKING' || selectedSO.status === 'PACKED') && (
                    <>
                      <Button variant="outline" onClick={handleOpenPickList}>
                        <ClipboardList className="mr-1.5 h-4 w-4" />
                        拣货单
                      </Button>
                      <Button onClick={handleFulfill} disabled={actionLoading}>
                        {actionLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                        <Truck className="mr-1.5 h-4 w-4" />
                        出库确认
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Pick List Dialog */}
      <Dialog open={pickListOpen} onOpenChange={setPickListOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>拣货单 - {pickListData?.orderNumber}</DialogTitle>
            <DialogDescription>{pickListData?.warehouseName}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4">
            {pickListData?.items && pickListData.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>货位</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>产品名称</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pickListData.items.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{row.binCode}</TableCell>
                      <TableCell className="font-mono">{row.skuCode}</TableCell>
                      <TableCell>{row.skuName}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">暂无拣货数据</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => window.print()}>打印</Button>
            <Button variant="outline" onClick={() => setPickListOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}