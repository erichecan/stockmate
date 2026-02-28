// Updated: 2026-02-28T10:10:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PackageSearch,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  PencilLine,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ─── Interfaces ───────────────────────────────────────────────

interface InventoryItem {
  id: string;
  skuId: string;
  warehouseId: string;
  binLocationId: string | null;
  quantity: number;
  lockedQty: number;
  sku: { id: string; code: string; product: { name: string } };
  warehouse: { id: string; name: string; code: string };
  binLocation: { id: string; code: string } | null;
}

interface LedgerEntry {
  id: string;
  skuId: string;
  warehouseId: string;
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT' | 'TRANSFER' | 'LOCK' | 'UNLOCK' | 'RETURN';
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  operatorId: string | null;
  createdAt: string;
  sku: { code: string; product: { name: string } };
  warehouse: { name: string; code: string };
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface BinLocation {
  id: string;
  code: string;
}

interface SkuOption {
  id: string;
  code: string;
  product: { name: string };
}

// ─── Constants ───────────────────────────────────────────────

const PAGE_SIZE = 15;
// Radix Select 禁止 value=""，用此常量表示“不指定”
const BIN_NONE = '__none__';
const LEDGER_TYPES = ['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER', 'LOCK', 'UNLOCK', 'RETURN'] as const;

const LEDGER_TYPE_LABELS: Record<string, string> = {
  INBOUND: '入库',
  OUTBOUND: '出库',
  ADJUSTMENT: '调整',
  TRANSFER: '调拨',
  LOCK: '锁定',
  UNLOCK: '解锁',
  RETURN: '退货',
};

const LEDGER_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INBOUND: 'default',
  OUTBOUND: 'destructive',
  ADJUSTMENT: 'secondary',
  TRANSFER: 'outline',
  LOCK: 'secondary',
  UNLOCK: 'outline',
  RETURN: 'default',
};

// ─── Sku Combobox ─────────────────────────────────────────────

function SkuCombobox({
  value,
  onSelect,
  placeholder = '搜索 SKU 编码或名称...',
}: {
  value: SkuOption | null;
  onSelect: (sku: SkuOption | null) => void;
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
            placeholder="输入 SKU 编码或商品名..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{loading ? '加载中...' : '未找到 SKU'}</CommandEmpty>
            <CommandGroup>
              {options.map((sku) => (
                <CommandItem
                  key={sku.id}
                  value={sku.id}
                  onSelect={() => {
                    onSelect(sku);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 shrink-0 ${value?.id === sku.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {sku.code} - {sku.product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('inventory');

  // Inventory tab state
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  // Ledger tab state
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Shared data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);

  // Dialog state
  const [inboundOpen, setInboundOpen] = useState(false);
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inbound form
  const [inboundSku, setInboundSku] = useState<SkuOption | null>(null);
  const [inboundWarehouseId, setInboundWarehouseId] = useState('');
  const [inboundBinLocationId, setInboundBinLocationId] = useState(BIN_NONE);
  const [inboundQuantity, setInboundQuantity] = useState('');
  const [inboundNotes, setInboundNotes] = useState('');
  const [inboundBins, setInboundBins] = useState<BinLocation[]>([]);

  // Outbound form
  const [outboundSku, setOutboundSku] = useState<SkuOption | null>(null);
  const [outboundWarehouseId, setOutboundWarehouseId] = useState('');
  const [outboundBinLocationId, setOutboundBinLocationId] = useState(BIN_NONE);
  const [outboundQuantity, setOutboundQuantity] = useState('');
  const [outboundNotes, setOutboundNotes] = useState('');
  const [outboundBins, setOutboundBins] = useState<BinLocation[]>([]);

  // Transfer form
  const [transferSku, setTransferSku] = useState<SkuOption | null>(null);
  const [transferFromWarehouseId, setTransferFromWarehouseId] = useState('');
  const [transferToWarehouseId, setTransferToWarehouseId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Adjust form
  const [adjustSku, setAdjustSku] = useState<SkuOption | null>(null);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // ─── Fetch Warehouses ───

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data } = await api.get<Warehouse[]>('/warehouses');
      setWarehouses(data ?? []);
    } catch {
      toast.error('获取仓库列表失败');
    } finally {
      setWarehousesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // ─── Fetch Bins for warehouse ───

  const fetchBins = useCallback(async (warehouseId: string) => {
    if (!warehouseId) return [];
    try {
      const { data } = await api.get<BinLocation[]>(`/warehouses/${warehouseId}/bins`);
      return data ?? [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (inboundWarehouseId) {
      fetchBins(inboundWarehouseId).then(setInboundBins);
      setInboundBinLocationId(BIN_NONE);
    } else {
      setInboundBins([]);
      setInboundBinLocationId(BIN_NONE);
    }
  }, [inboundWarehouseId, fetchBins]);

  useEffect(() => {
    if (outboundWarehouseId) {
      fetchBins(outboundWarehouseId).then(setOutboundBins);
      setOutboundBinLocationId(BIN_NONE);
    } else {
      setOutboundBins([]);
      setOutboundBinLocationId(BIN_NONE);
    }
  }, [outboundWarehouseId, fetchBins]);

  // ─── Fetch Inventory ───

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const { data } = await api.get<{ data: InventoryItem[]; total: number }>('/inventory', {
        params: {
          warehouseId: warehouseFilter === 'all' ? undefined : warehouseFilter,
          page: inventoryPage,
          limit: PAGE_SIZE,
        },
      });
      setInventoryData(data?.data ?? []);
      setInventoryTotal(data?.total ?? 0);
    } catch {
      toast.error('获取库存列表失败');
    } finally {
      setInventoryLoading(false);
    }
  }, [warehouseFilter, inventoryPage]);

  useEffect(() => {
    if (activeTab === 'inventory') fetchInventory();
  }, [activeTab, fetchInventory]);

  // ─── Fetch Ledger ───

  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const { data } = await api.get<{ data: LedgerEntry[]; total: number }>('/inventory/ledger', {
        params: {
          type: ledgerTypeFilter === 'all' ? undefined : ledgerTypeFilter,
          startDate: ledgerStartDate || undefined,
          endDate: ledgerEndDate || undefined,
          page: ledgerPage,
          limit: PAGE_SIZE,
        },
      });
      setLedgerData(data?.data ?? []);
      setLedgerTotal(data?.total ?? 0);
    } catch {
      toast.error('获取操作日志失败');
    } finally {
      setLedgerLoading(false);
    }
  }, [ledgerTypeFilter, ledgerStartDate, ledgerEndDate, ledgerPage]);

  useEffect(() => {
    if (activeTab === 'ledger') fetchLedger();
  }, [activeTab, fetchLedger]);

  // ─── Action Handlers ───

  const resetInboundForm = () => {
    setInboundSku(null);
    setInboundWarehouseId('');
    setInboundBinLocationId(BIN_NONE);
    setInboundQuantity('');
    setInboundNotes('');
  };

  const resetOutboundForm = () => {
    setOutboundSku(null);
    setOutboundWarehouseId('');
    setOutboundBinLocationId(BIN_NONE);
    setOutboundQuantity('');
    setOutboundNotes('');
  };

  const resetTransferForm = () => {
    setTransferSku(null);
    setTransferFromWarehouseId('');
    setTransferToWarehouseId('');
    setTransferQuantity('');
    setTransferNotes('');
  };

  const resetAdjustForm = () => {
    setAdjustSku(null);
    setAdjustWarehouseId('');
    setAdjustQuantity('');
    setAdjustNotes('');
  };

  const handleInbound = async () => {
    if (!inboundSku || !inboundWarehouseId) {
      toast.error('请选择 SKU 和仓库');
      return;
    }
    const qty = parseInt(inboundQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error('请输入有效数量');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/inbound', {
        skuId: inboundSku.id,
        warehouseId: inboundWarehouseId,
        binLocationId: inboundBinLocationId && inboundBinLocationId !== BIN_NONE ? inboundBinLocationId : undefined,
        quantity: qty,
        notes: inboundNotes || undefined,
      });
      toast.success('入库成功');
      setInboundOpen(false);
      resetInboundForm();
      fetchInventory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? '入库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOutbound = async () => {
    if (!outboundSku || !outboundWarehouseId) {
      toast.error('请选择 SKU 和仓库');
      return;
    }
    const qty = parseInt(outboundQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error('请输入有效数量');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/outbound', {
        skuId: outboundSku.id,
        warehouseId: outboundWarehouseId,
        binLocationId: outboundBinLocationId && outboundBinLocationId !== BIN_NONE ? outboundBinLocationId : undefined,
        quantity: qty,
        notes: outboundNotes || undefined,
      });
      toast.success('出库成功');
      setOutboundOpen(false);
      resetOutboundForm();
      fetchInventory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? '出库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferSku || !transferFromWarehouseId || !transferToWarehouseId) {
      toast.error('请选择 SKU、源仓库和目标仓库');
      return;
    }
    if (transferFromWarehouseId === transferToWarehouseId) {
      toast.error('源仓库和目标仓库不能相同');
      return;
    }
    const qty = parseInt(transferQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error('请输入有效数量');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/transfer', {
        skuId: transferSku.id,
        fromWarehouseId: transferFromWarehouseId,
        toWarehouseId: transferToWarehouseId,
        quantity: qty,
        notes: transferNotes || undefined,
      });
      toast.success('调拨成功');
      setTransferOpen(false);
      resetTransferForm();
      fetchInventory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? '调拨失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustSku || !adjustWarehouseId) {
      toast.error('请选择 SKU 和仓库');
      return;
    }
    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      toast.error('请输入有效数量（正数增加，负数减少）');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/adjust', {
        skuId: adjustSku.id,
        warehouseId: adjustWarehouseId,
        quantity: qty,
        notes: adjustNotes || undefined,
      });
      toast.success('调整成功');
      setAdjustOpen(false);
      resetAdjustForm();
      fetchInventory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? '调整失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Pagination ───

  const inventoryTotalPages = Math.max(1, Math.ceil(inventoryTotal / PAGE_SIZE));
  const ledgerTotalPages = Math.max(1, Math.ceil(ledgerTotal / PAGE_SIZE));

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleString('zh-CN');
    } catch {
      return s;
    }
  };

  const ledgerRefDisplay = (e: LedgerEntry) => {
    if (e.referenceType && e.referenceId) return `${e.referenceType} ${e.referenceId}`;
    return '-';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">库存管理</h1>
        <p className="text-muted-foreground">
          库存台账按「仓库」关联，货位来自「仓库管理」中配置的库位；货位为空表示暂存区。
          查看库存台账、操作日志，执行入库、出库、调拨与数量调整。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>库存与日志</CardTitle>
            <CardDescription>库存台账与操作日志</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" onClick={() => setInboundOpen(true)}>
              <ArrowDownToLine className="h-4 w-4" />
              入库
            </Button>
            <Button variant="default" size="sm" onClick={() => setOutboundOpen(true)}>
              <ArrowUpFromLine className="h-4 w-4" />
              出库
            </Button>
            <Button variant="default" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" />
              调拨
            </Button>
            <Button variant="default" size="sm" onClick={() => setAdjustOpen(true)}>
              <PencilLine className="h-4 w-4" />
              调整
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="inventory">
                <PackageSearch className="h-4 w-4 mr-1" />
                库存台账
              </TabsTrigger>
              <TabsTrigger value="ledger">操作日志</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>仓库</Label>
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="全部仓库" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部仓库</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU编码</TableHead>
                        <TableHead>商品名称</TableHead>
                        <TableHead>仓库</TableHead>
                        <TableHead>货位</TableHead>
                        <TableHead>可用数量</TableHead>
                        <TableHead>锁定数量</TableHead>
                        <TableHead>总数量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            暂无库存数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        inventoryData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.sku.code}</TableCell>
                            <TableCell>{item.sku.product.name}</TableCell>
                            <TableCell>{item.warehouse.name} ({item.warehouse.code})</TableCell>
                            <TableCell>{item.binLocation?.code ?? '-'}</TableCell>
                            <TableCell>{item.quantity - item.lockedQty}</TableCell>
                            <TableCell>{item.lockedQty}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      共 {inventoryTotal} 条
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                        disabled={inventoryPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {inventoryPage} / {inventoryTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setInventoryPage((p) => Math.min(inventoryTotalPages, p + 1))}
                        disabled={inventoryPage >= inventoryTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="ledger" className="space-y-4 mt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>类型</Label>
                  <Select value={ledgerTypeFilter} onValueChange={setLedgerTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="全部类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      {LEDGER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {LEDGER_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>结束日期</Label>
                  <Input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={fetchLedger}>
                  <Search className="h-4 w-4" />
                  查询
                </Button>
              </div>
              {ledgerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>SKU编码</TableHead>
                        <TableHead>商品名称</TableHead>
                        <TableHead>仓库</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>关联单据</TableHead>
                        <TableHead>备注</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            暂无操作日志
                          </TableCell>
                        </TableRow>
                      ) : (
                        ledgerData.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{formatDate(entry.createdAt)}</TableCell>
                            <TableCell>
                              <Badge variant={LEDGER_TYPE_VARIANTS[entry.type] ?? 'secondary'}>
                                {LEDGER_TYPE_LABELS[entry.type] ?? entry.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{entry.sku.code}</TableCell>
                            <TableCell>{entry.sku.product.name}</TableCell>
                            <TableCell>{entry.warehouse.name} ({entry.warehouse.code})</TableCell>
                            <TableCell>
                              {entry.quantity >= 0 ? `+${entry.quantity}` : `${entry.quantity}`}
                            </TableCell>
                            <TableCell>{ledgerRefDisplay(entry)}</TableCell>
                            <TableCell>{entry.notes ?? '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      共 {ledgerTotal} 条
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                        disabled={ledgerPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {ledgerPage} / {ledgerTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
                        disabled={ledgerPage >= ledgerTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Inbound Dialog */}
      <Dialog open={inboundOpen} onOpenChange={setInboundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入库</DialogTitle>
            <DialogDescription>登记入库数量</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <SkuCombobox value={inboundSku} onSelect={setInboundSku} />
            </div>
            <div className="grid gap-2">
              <Label>仓库</Label>
              <Select value={inboundWarehouseId} onValueChange={setInboundWarehouseId}>
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
              <Label>货位（可选）</Label>
              <Select
                value={inboundBinLocationId || BIN_NONE}
                onValueChange={(v) => setInboundBinLocationId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择货位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BIN_NONE}>不指定</SelectItem>
                  {inboundBins.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code}
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
                value={inboundQuantity}
                onChange={(e) => setInboundQuantity(e.target.value)}
                placeholder="入库数量"
              />
            </div>
            <div className="grid gap-2">
              <Label>备注（可选）</Label>
              <Input
                value={inboundNotes}
                onChange={(e) => setInboundNotes(e.target.value)}
                placeholder="备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInboundOpen(false)}>
              取消
            </Button>
            <Button onClick={handleInbound} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outbound Dialog */}
      <Dialog open={outboundOpen} onOpenChange={setOutboundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>出库</DialogTitle>
            <DialogDescription>登记出库数量</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <SkuCombobox value={outboundSku} onSelect={setOutboundSku} />
            </div>
            <div className="grid gap-2">
              <Label>仓库</Label>
              <Select value={outboundWarehouseId} onValueChange={setOutboundWarehouseId}>
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
              <Label>货位（可选）</Label>
              <Select
                value={outboundBinLocationId || BIN_NONE}
                onValueChange={(v) => setOutboundBinLocationId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择货位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BIN_NONE}>不指定</SelectItem>
                  {outboundBins.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code}
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
                value={outboundQuantity}
                onChange={(e) => setOutboundQuantity(e.target.value)}
                placeholder="出库数量"
              />
            </div>
            <div className="grid gap-2">
              <Label>备注（可选）</Label>
              <Input
                value={outboundNotes}
                onChange={(e) => setOutboundNotes(e.target.value)}
                placeholder="备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutboundOpen(false)}>
              取消
            </Button>
            <Button onClick={handleOutbound} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调拨</DialogTitle>
            <DialogDescription>仓库间调拨</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <SkuCombobox value={transferSku} onSelect={setTransferSku} />
            </div>
            <div className="grid gap-2">
              <Label>源仓库</Label>
              <Select value={transferFromWarehouseId} onValueChange={setTransferFromWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择源仓库" />
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
              <Label>目标仓库</Label>
              <Select value={transferToWarehouseId} onValueChange={setTransferToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择目标仓库" />
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
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                placeholder="调拨数量"
              />
            </div>
            <div className="grid gap-2">
              <Label>备注（可选）</Label>
              <Input
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              取消
            </Button>
            <Button onClick={handleTransfer} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整</DialogTitle>
            <DialogDescription>调整库存数量（正数增加，负数减少）</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <SkuCombobox value={adjustSku} onSelect={setAdjustSku} />
            </div>
            <div className="grid gap-2">
              <Label>仓库</Label>
              <Select value={adjustWarehouseId} onValueChange={setAdjustWarehouseId}>
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
              <Label>数量（正数增加，负数减少）</Label>
              <Input
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="如 -5 表示减少 5"
              />
            </div>
            <div className="grid gap-2">
              <Label>备注（可选）</Label>
              <Input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdjust} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
