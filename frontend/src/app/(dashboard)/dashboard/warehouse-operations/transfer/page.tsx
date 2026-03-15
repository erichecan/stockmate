// 仓内作业 - 库存移动：表单提交 + 移库记录列表（来自台账 TRANSFER）
// Updated: 2026-03-14
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft,
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
import {
  Card,
  CardContent,
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

interface LedgerRow {
  id: string;
  type: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  sku: { id: string; code: string; product: { name: string } };
  warehouse: { id: string; name: string; code: string };
}

interface ListResponse {
  data: LedgerRow[];
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

const PAGE_SIZE = 15;

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
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value ? `${value.code} - ${value.product.name}` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="输入 SKU 编码或名称..." value={search} onValueChange={setSearch} />
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

export default function TransferPage() {
  const [list, setList] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [formSku, setFormSku] = useState<SkuOption | null>(null);
  const [formFromWarehouseId, setFormFromWarehouseId] = useState('');
  const [formToWarehouseId, setFormToWarehouseId] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formNotes, setFormNotes] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ListResponse>('/inventory/ledger', {
        params: { referenceType: 'TRANSFER', page, limit: PAGE_SIZE },
      });
      setList(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '加载移库记录失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    if (!formSku || !formFromWarehouseId || !formToWarehouseId) {
      toast.error('请选择 SKU、源仓库和目标仓库');
      return;
    }
    if (formFromWarehouseId === formToWarehouseId) {
      toast.error('源仓库与目标仓库不能相同');
      return;
    }
    const qty = parseInt(formQuantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      toast.error('数量至少为 1');
      return;
    }
    setSubmitLoading(true);
    try {
      await api.post('/inventory/transfer', {
        skuId: formSku.id,
        fromWarehouseId: formFromWarehouseId,
        toWarehouseId: formToWarehouseId,
        quantity: qty,
        notes: formNotes.trim() || undefined,
      });
      toast.success('移库成功');
      setCreateOpen(false);
      setFormSku(null);
      setFormFromWarehouseId('');
      setFormToWarehouseId('');
      setFormQuantity('1');
      setFormNotes('');
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '移库失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">库存移动</h1>
        <p className="text-muted-foreground">在仓库间或库位间移库，扣减源库存并增加目标库存。</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>移库记录</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchList()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              新建移库
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">暂无移库记录</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>仓库</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {row.type === 'INBOUND' ? (
                          <span className="text-green-600">移入</span>
                        ) : (
                          <span className="text-orange-600">移出</span>
                        )}
                      </TableCell>
                      <TableCell>{row.sku?.code ?? '-'}</TableCell>
                      <TableCell>{row.sku?.product?.name ?? '-'}</TableCell>
                      <TableCell>{row.warehouse?.name ?? '-'}</TableCell>
                      <TableCell className="text-right font-medium">{row.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{row.notes ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">共 {total} 条</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-2 text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建移库</DialogTitle>
            <DialogDescription>从源仓库移出，进入目标仓库。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <SkuCombobox value={formSku} onSelect={setFormSku} />
            </div>
            <div className="grid gap-2">
              <Label>源仓库</Label>
              <Select
                value={formFromWarehouseId}
                onValueChange={setFormFromWarehouseId}
                disabled={warehousesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择源仓库" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>目标仓库</Label>
              <Select value={formToWarehouseId} onValueChange={setFormToWarehouseId} disabled={warehousesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="选择目标仓库" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} - {w.name}
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
                placeholder="1"
              />
            </div>
            <div className="grid gap-2">
              <Label>备注（可选）</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="移库原因" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={submitLoading}>
              {submitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
