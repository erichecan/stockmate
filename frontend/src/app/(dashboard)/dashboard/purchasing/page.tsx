// Updated: 2026-02-28T10:10:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Plus,
  Eye,
  Loader2,
  Search,
  Ship,
  Anchor,
  Package,
  ChevronLeft,
  ChevronRight,
  Trash2,
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

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface Sku {
  id: string;
  code: string;
  product: { name: string };
  retailPrice: string | null;
}

interface POItem {
  id: string;
  skuId: string;
  sku: { id: string; code: string; product: { name: string } };
  quantity: number;
  unitPrice: string;
  receivedQty: number;
}

interface Shipment {
  id: string;
  containerNo: string | null;
  vesselName: string | null;
  status: 'PENDING' | 'LOADED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';
  etd: string | null;
  eta: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier: { id: string; name: string; code: string };
  status:
    | 'DRAFT'
    | 'CONFIRMED'
    | 'SHIPPED'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'COMPLETED'
    | 'CANCELLED';
  totalAmount: string | null;
  currency: string;
  notes: string | null;
  orderedAt: string | null;
  expectedAt: string | null;
  createdAt: string;
  items?: POItem[];
  shipments?: Shipment[];
}

type POStatus = PurchaseOrder['status'];

interface CreatePOItem {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPrice: string;
}

// ─── Helpers ───────────────────────────────────────────────

const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: '草稿',
  CONFIRMED: '已确认',
  SHIPPED: '已发货',
  IN_TRANSIT: '运输中',
  ARRIVED: '已到达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const STATUS_VARIANTS: Record<POStatus, string> = {
  DRAFT: 'secondary',
  CONFIRMED: 'default',
  SHIPPED: 'outline',
  IN_TRANSIT: 'outline',
  ARRIVED: 'default',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

const SHIPMENT_STATUS_LABELS: Record<Shipment['status'], string> = {
  PENDING: '待装运',
  LOADED: '已装运',
  IN_TRANSIT: '运输中',
  ARRIVED: '已到达',
  DELIVERED: '已交付',
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

function StatusBadge({ status }: { status: POStatus }) {
  const variant = STATUS_VARIANTS[status] as 'secondary' | 'default' | 'outline' | 'destructive';
  const bgClass: Record<string, string> = {
    DRAFT: 'bg-gray-500/15 text-gray-700 dark:text-gray-300',
    CONFIRMED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    SHIPPED: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    IN_TRANSIT: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
    ARRIVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
    COMPLETED: 'bg-green-500/15 text-green-700 dark:text-green-300',
    CANCELLED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  };
  return (
    <Badge variant={variant} className={bgClass[status] ?? ''}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const PAGE_SIZE = 10;

// ─── Component ───────────────────────────────────────────

export default function PurchasingPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [createSupplierId, setCreateSupplierId] = useState('');
  const [createCurrency, setCreateCurrency] = useState('CNY');
  const [createNotes, setCreateNotes] = useState('');
  const [createItems, setCreateItems] = useState<CreatePOItem[]>([]);
  const [skuSearchOpen, setSkuSearchOpen] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [skuSearchResults, setSkuSearchResults] = useState<Sku[]>([]);
  const [skuSearchLoading, setSkuSearchLoading] = useState(false);

  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ─── Fetch Orders ───

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/purchasing/orders', {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(statusFilter && { status: statusFilter }),
        },
      });
      setOrders(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('获取采购订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Fetch Suppliers (for create dialog) ───

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data } = await api.get('/suppliers', {
        params: { limit: 200 },
      });
      setSuppliers(data.data ?? []);
    } catch {
      toast.error('获取供应商列表失败');
    }
  }, []);

  useEffect(() => {
    if (createDialogOpen) {
      fetchSuppliers();
    }
  }, [createDialogOpen, fetchSuppliers]);

  // ─── SKU Search (debounced) ───

  useEffect(() => {
    if (!skuSearchOpen || !skuSearchQuery.trim()) {
      setSkuSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSkuSearchLoading(true);
        const { data } = await api.get('/skus', {
          params: { search: skuSearchQuery.trim(), limit: 10 },
        });
        setSkuSearchResults(data.data ?? []);
      } catch {
        setSkuSearchResults([]);
      } finally {
        setSkuSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [skuSearchOpen, skuSearchQuery]);

  // ─── Create PO ───

  const handleOpenCreate = useCallback(() => {
    setCreateSupplierId('');
    setCreateCurrency('CNY');
    setCreateNotes('');
    setCreateItems([]);
    setCreateDialogOpen(true);
  }, []);

  const handleAddItem = useCallback((sku: Sku) => {
    if (createItems.some((i) => i.skuId === sku.id)) {
      toast.error('该 SKU 已添加');
      return;
    }
    setCreateItems((prev) => [
      ...prev,
      {
        skuId: sku.id,
        skuCode: sku.code,
        productName: sku.product.name,
        quantity: 1,
        unitPrice: sku.retailPrice ?? '0',
      },
    ]);
    setSkuSearchOpen(false);
    setSkuSearchQuery('');
  }, [createItems]);

  const handleRemoveItem = useCallback((index: number) => {
    setCreateItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateItem = useCallback(
    (index: number, field: keyof CreatePOItem, value: number | string) => {
      setCreateItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const calculatedTotal = createItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  const handleCreatePO = useCallback(async () => {
    if (!createSupplierId.trim()) {
      toast.error('请选择供应商');
      return;
    }
    if (createItems.length === 0) {
      toast.error('请至少添加一个商品');
      return;
    }
    try {
      setCreateSubmitting(true);
      await api.post('/purchasing/orders', {
        supplierId: createSupplierId,
        currency: createCurrency,
        notes: createNotes.trim() || undefined,
        items: createItems.map((i) => ({
          skuId: i.skuId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      toast.success('采购订单创建成功');
      setCreateDialogOpen(false);
      await fetchOrders();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '创建失败，请重试';
      toast.error(msg);
    } finally {
      setCreateSubmitting(false);
    }
  }, [
    createSupplierId,
    createCurrency,
    createNotes,
    createItems,
    fetchOrders,
  ]);

  // ─── PO Detail Sheet ───

  const handleOpenDetail = useCallback(async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setDetailSheetOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/purchasing/orders/${po.id}`);
      setSelectedPO(data);
    } catch {
      toast.error('获取订单详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleUpdateStatus = useCallback(
    async (poId: string, newStatus: POStatus) => {
      try {
        setStatusUpdating(true);
        await api.patch(`/purchasing/orders/${poId}`, { status: newStatus });
        toast.success('状态更新成功');
        if (selectedPO?.id === poId) {
          setSelectedPO((prev) =>
            prev ? { ...prev, status: newStatus } : null
          );
        }
        await fetchOrders();
      } catch {
        toast.error('状态更新失败');
      } finally {
        setStatusUpdating(false);
      }
    },
    [selectedPO, fetchOrders]
  );

  const handleCancelPO = useCallback(
    async (poId: string) => {
      try {
        setCancelLoading(true);
        await api.post(`/purchasing/orders/${poId}/cancel`);
        toast.success('订单已取消');
        if (selectedPO?.id === poId) {
          setSelectedPO((prev) =>
            prev ? { ...prev, status: 'CANCELLED' as const } : null
          );
        }
        setDetailSheetOpen(false);
        await fetchOrders();
      } catch {
        toast.error('取消失败');
      } finally {
        setCancelLoading(false);
      }
    },
    [selectedPO, fetchOrders]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShoppingCart className="h-6 w-6" />
            采购订单管理
          </h1>
          <p className="text-muted-foreground">
            管理采购订单、查看详情及物流跟踪
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建采购订单
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>采购订单列表</CardTitle>
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
                  {(Object.keys(STATUS_LABELS) as POStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
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
              <h3 className="mt-4 text-lg font-medium">暂无采购订单</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击「新建采购订单」创建第一个订单
              </p>
              <Button onClick={handleOpenCreate} className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                新建采购订单
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO编号</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">总金额</TableHead>
                    <TableHead>币种</TableHead>
                    <TableHead>预计到达</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((po) => (
                    <TableRow
                      key={po.id}
                      className="cursor-pointer"
                      onClick={() => handleOpenDetail(po)}
                    >
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {po.orderNumber}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{po.supplier?.name ?? '-'}</span>
                        {po.supplier?.code && (
                          <span className="ml-1 text-muted-foreground text-xs">
                            ({po.supplier.code})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={po.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {po.totalAmount != null ? po.totalAmount : '-'}
                      </TableCell>
                      <TableCell>{po.currency}</TableCell>
                      <TableCell>{formatDate(po.expectedAt)}</TableCell>
                      <TableCell>{formatDate(po.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(po);
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

      {/* Create PO Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建采购订单</DialogTitle>
            <DialogDescription>
              选择供应商并添加商品，填写数量和单价
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4 pr-1">
            <div className="grid gap-2">
              <Label>供应商 *</Label>
              <Select
                value={createSupplierId}
                onValueChange={setCreateSupplierId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择供应商" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>币种</Label>
                <Select value={createCurrency} onValueChange={setCreateCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <Search className="mr-2 h-4 w-4" />
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
                            <div>
                              <span className="font-mono">{sku.code}</span>
                              <span className="ml-2 text-muted-foreground">
                                {sku.product.name}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {createItems.length > 0 && (
              <div className="space-y-2">
                <Label>商品明细</Label>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU / 产品</TableHead>
                        <TableHead className="w-24">数量</TableHead>
                        <TableHead className="w-28">单价</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {createItems.map((item, i) => (
                        <TableRow key={item.skuId}>
                          <TableCell>
                            <code className="text-xs">{item.skuCode}</code>
                            <span className="ml-1 text-muted-foreground text-xs">
                              {item.productName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(
                                  i,
                                  'quantity',
                                  Number(e.target.value) || 1
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItem(i, 'unitPrice', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(i)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm font-medium">
                  合计: {createCurrency}{' '}
                  {calculatedTotal.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createSubmitting}
            >
              取消
            </Button>
            <Button onClick={handleCreatePO} disabled={createSubmitting}>
              {createSubmitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              创建订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl"
        >
          <SheetHeader>
            <SheetTitle>
              {selectedPO ? (
                <span>
                  采购订单 {selectedPO.orderNumber}
                  <StatusBadge status={selectedPO.status} />
                </span>
              ) : (
                '订单详情'
              )}
            </SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPO ? (
            <div className="space-y-6 py-4">
              {/* PO Info */}
              <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-medium">订单信息</h4>
                <div className="grid gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">供应商：</span>
                    {selectedPO.supplier?.name} ({selectedPO.supplier?.code})
                  </p>
                  <p>
                    <span className="text-muted-foreground">总金额：</span>
                    {selectedPO.totalAmount ?? '-'} {selectedPO.currency}
                  </p>
                  <p>
                    <span className="text-muted-foreground">下单时间：</span>
                    {formatDate(selectedPO.orderedAt)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">预计到达：</span>
                    {formatDate(selectedPO.expectedAt)}
                  </p>
                  {selectedPO.notes && (
                    <p>
                      <span className="text-muted-foreground">备注：</span>
                      {selectedPO.notes}
                    </p>
                  )}
                </div>

                {/* Update status */}
                {selectedPO.status !== 'COMPLETED' &&
                  selectedPO.status !== 'CANCELLED' && (
                    <div className="mt-3 flex items-center gap-2">
                      <Label className="text-xs">更新状态</Label>
                      <Select
                        value=""
                        onValueChange={(v) => {
                          if (v)
                            handleUpdateStatus(
                              selectedPO.id,
                              v as POStatus
                            );
                        }}
                        disabled={statusUpdating}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="选择新状态" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as POStatus[])
                            .filter(
                              (s) =>
                                s !== selectedPO.status &&
                                s !== 'CANCELLED' &&
                                s !== 'DRAFT'
                            )
                            .map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelPO(selectedPO.id)}
                        disabled={cancelLoading}
                      >
                        {cancelLoading && (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        )}
                        取消订单
                      </Button>
                    </div>
                  )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="font-medium">商品明细</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU / 产品</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                        <TableHead className="text-right">单价</TableHead>
                        <TableHead className="text-right">已收货</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedPO.items ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <code className="text-xs">
                              {item.sku?.code ?? '-'}
                            </code>
                            <span className="ml-1 text-muted-foreground text-xs">
                              {item.sku?.product?.name ?? '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unitPrice}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.receivedQty}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Shipments */}
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 font-medium">
                  <Ship className="h-4 w-4" />
                  物流跟踪
                </h4>
                {(selectedPO.shipments ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    暂无物流信息
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedPO.shipments!.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Anchor className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {s.containerNo ?? '无箱号'}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {SHIPMENT_STATUS_LABELS[s.status]}
                          </Badge>
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                          {s.vesselName && (
                            <p>船名: {s.vesselName}</p>
                          )}
                          <p>
                            ETD: {formatDate(s.etd)} → ETA: {formatDate(s.eta)}
                          </p>
                          {(s.portOfLoading || s.portOfDischarge) && (
                            <p>
                              {s.portOfLoading ?? '-'} →{' '}
                              {s.portOfDischarge ?? '-'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
