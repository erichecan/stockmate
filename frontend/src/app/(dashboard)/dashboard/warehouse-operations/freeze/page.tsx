// 仓内作业 - 库存冻结：列表、新建冻结、解冻
// Updated: 2026-03-14
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  LockOpen,
  RefreshCw,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// ─── Types ───────────────────────────────────────────────────

interface StockFreezeRow {
  id: string;
  quantity: number;
  reason: string | null;
  status: 'ACTIVE' | 'RELEASED';
  createdAt: string;
  sku: { id: string; code: string; product: { name: string } };
  warehouse: { id: string; name: string; code: string };
  binLocation: { id: string; code: string } | null;
}

interface ListResponse {
  data: StockFreezeRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface SkuOption {
  id: string;
  code: string;
  product: { name: string };
}

// ─── Constants ───────────────────────────────────────────────

const PAGE_SIZE = 15;
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '生效中' },
  { value: 'RELEASED', label: '已解冻' },
] as const;

// ─── Sku Combobox ─────────────────────────────────────────────

function SkuCombobox({
  value,
  onSelect,
  placeholder = '搜索 SKU...',
}: {
  value: SkuOption | null;
  onSelect: (s: SkuOption | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSkus = useCallback(async () => {
    if (!search.trim()) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<{ data: SkuOption[] }>('/skus', {
        params: { search: search.trim(), limit: 10, page: 1 },
      });
      setOptions(data?.data ?? []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchSkus(), 300);
    return () => clearTimeout(t);
  }, [fetchSkus]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? `${value.code} - ${value.product.name}` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="输入 SKU 编码或名称..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{loading ? '加载中...' : '无匹配 SKU'}</CommandEmpty>
            <CommandGroup>
              {options.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => {
                    onSelect(s);
                    setOpen(false);
                  }}
                >
                  {s.code} - {s.product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function FreezePage() {
  const [list, setList] = useState<StockFreezeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const [formSku, setFormSku] = useState<SkuOption | null>(null);
  const [formWarehouseId, setFormWarehouseId] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('1');
  const [formReason, setFormReason] = useState<string>('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get<ListResponse>('/stock-freeze', { params });
      setList(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '加载冻结单列表失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<Warehouse[]>('/warehouses');
        if (!cancelled) setWarehouses(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setWarehouses([]);
      } finally {
        if (!cancelled) setWarehousesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRelease = async (id: string) => {
    setReleasingId(id);
    try {
      await api.post(`/stock-freeze/${id}/release`);
      toast.success('解冻成功');
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '解冻失败');
    } finally {
      setReleasingId(null);
    }
  };

  const handleCreate = async () => {
    if (!formSku || !formWarehouseId) {
      toast.error('请选择 SKU 和仓库');
      return;
    }
    const qty = parseInt(formQuantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      toast.error('数量至少为 1');
      return;
    }
    setSubmitLoading(true);
    try {
      await api.post('/stock-freeze', {
        skuId: formSku.id,
        warehouseId: formWarehouseId,
        quantity: qty,
        reason: formReason.trim() || undefined,
      });
      toast.success('冻结单创建成功');
      setCreateOpen(false);
      setFormSku(null);
      setFormWarehouseId('');
      setFormQuantity('1');
      setFormReason('');
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '创建失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">库存冻结</h1>
        <p className="text-muted-foreground">
          创建冻结单将扣减可用库存（增加锁定数量）；解冻后释放锁定。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>冻结单列表</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchList()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建冻结
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>单据号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>仓库</TableHead>
                    <TableHead>库位</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        暂无冻结单
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {row.status === 'ACTIVE' ? '生效中' : '已解冻'}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.sku.code}</TableCell>
                        <TableCell>{row.sku.product.name}</TableCell>
                        <TableCell>{row.warehouse.name}</TableCell>
                        <TableCell>{row.binLocation?.code ?? '-'}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell>{row.reason ?? '-'}</TableCell>
                        <TableCell>
                          {new Date(row.createdAt).toLocaleString('zh-CN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell>
                          {row.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={releasingId === row.id}
                              onClick={() => handleRelease(row.id)}
                            >
                              {releasingId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <LockOpen className="mr-1 h-4 w-4" />
                                  解冻
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <p className="text-sm text-muted-foreground">
                    共 {total} 条，第 {page} / {totalPages} 页
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>新建冻结单</DialogTitle>
            <DialogDescription>
              选择 SKU、仓库与数量，将对应可用库存转为锁定（冻结）。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <SkuCombobox value={formSku} onSelect={setFormSku} />
            </div>
            <div className="grid gap-2">
              <Label>仓库</Label>
              <Select
                value={formWarehouseId}
                onValueChange={setFormWarehouseId}
                disabled={warehousesLoading}
              >
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
              <Label>数量</Label>
              <Input
                type="number"
                min={1}
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>原因（选填）</Label>
              <Input
                placeholder="如：盘点预留"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={submitLoading}>
              {submitLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              确认冻结
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
