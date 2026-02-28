// Updated: 2026-02-28T10:10:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

// Updated: 2026-02-28T12:00:00 - barcode popup, bin creation for all warehouses

// ─── Types ─────────────────────────────────────────────────────────────

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface BinLocation {
  id: string;
  code: string;
  warehouseId: string;
  zone: string | null;
  aisle: string | null;
  shelf: string | null;
  position: string | null;
  barcode: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Component ─────────────────────────────────────────────────────────

export default function WarehousesPage() {
  // Warehouse list
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);

  // Warehouse dialog
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null
  );
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: '',
    isDefault: false,
  });
  const [warehouseSaving, setWarehouseSaving] = useState(false);

  // Warehouse delete dialog
  const [warehouseDeleteOpen, setWarehouseDeleteOpen] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] =
    useState<Warehouse | null>(null);
  const [warehouseDeleting, setWarehouseDeleting] = useState(false);

  // Bin locations
  const [bins, setBins] = useState<BinLocation[]>([]);
  const [binsLoading, setBinsLoading] = useState(false);

  // Bin dialog
  const [binDialogOpen, setBinDialogOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<BinLocation | null>(null);
  const [binForm, setBinForm] = useState({
    code: '',
    zone: '',
    aisle: '',
    shelf: '',
    position: '',
  });
  const [binSaving, setBinSaving] = useState(false);

  // Bin delete dialog
  const [binDeleteOpen, setBinDeleteOpen] = useState(false);
  const [deletingBin, setDeletingBin] = useState<BinLocation | null>(null);
  const [binDeleting, setBinDeleting] = useState(false);

  // Barcode preview dialog
  const [barcodePopupOpen, setBarcodePopupOpen] = useState(false);
  const [barcodeText, setBarcodeText] = useState('');
  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  // ─── Data Fetching ───────────────────────────────────────────────────

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Warehouse[]>('/warehouses');
      setWarehouses(Array.isArray(data) ? data : []);
    } catch {
      toast.error('加载仓库列表失败');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBins = useCallback(
    async (warehouseId: string) => {
      setBinsLoading(true);
      try {
        const { data } = await api.get<BinLocation[]>(
          `/warehouses/${warehouseId}/bins`
        );
        setBins(Array.isArray(data) ? data : []);
      } catch {
        toast.error('加载库位列表失败');
        setBins([]);
      } finally {
        setBinsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchBins(selectedWarehouse.id);
    } else {
      setBins([]);
    }
  }, [selectedWarehouse, fetchBins]);

  // ─── Warehouse Handlers ────────────────────────────────────────────

  const openWarehouseCreate = () => {
    setEditingWarehouse(null);
    setWarehouseForm({
      name: '',
      code: '',
      address: '',
      city: '',
      country: '',
      isDefault: false,
    });
    setWarehouseDialogOpen(true);
  };

  const openWarehouseEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setWarehouseForm({
      name: w.name,
      code: w.code,
      address: w.address ?? '',
      city: w.city ?? '',
      country: w.country ?? '',
      isDefault: w.isDefault,
    });
    setWarehouseDialogOpen(true);
  };

  const handleWarehouseSave = async () => {
    if (!warehouseForm.name.trim()) {
      toast.error('请输入仓库名称');
      return;
    }
    if (!warehouseForm.code.trim()) {
      toast.error('请输入仓库编码');
      return;
    }
    setWarehouseSaving(true);
    try {
      const payload = {
        name: warehouseForm.name.trim(),
        code: warehouseForm.code.trim(),
        address: warehouseForm.address.trim() || null,
        city: warehouseForm.city.trim() || null,
        country: warehouseForm.country.trim() || null,
        isDefault: warehouseForm.isDefault,
      };
      if (editingWarehouse) {
        await api.patch(`/warehouses/${editingWarehouse.id}`, payload);
        toast.success('仓库更新成功');
      } else {
        await api.post('/warehouses', payload);
        toast.success('仓库创建成功');
      }
      setWarehouseDialogOpen(false);
      fetchWarehouses();
    } catch {
      toast.error(editingWarehouse ? '更新仓库失败' : '创建仓库失败');
    } finally {
      setWarehouseSaving(false);
    }
  };

  const openWarehouseDelete = (w: Warehouse) => {
    setDeletingWarehouse(w);
    setWarehouseDeleteOpen(true);
  };

  const handleWarehouseDelete = async () => {
    if (!deletingWarehouse) return;
    setWarehouseDeleting(true);
    try {
      await api.delete(`/warehouses/${deletingWarehouse.id}`);
      toast.success('仓库已删除');
      setWarehouseDeleteOpen(false);
      if (selectedWarehouse?.id === deletingWarehouse.id) {
        setSelectedWarehouse(null);
      }
      fetchWarehouses();
    } catch {
      toast.error('删除仓库失败');
    } finally {
      setWarehouseDeleting(false);
    }
  };

  // ─── Bin Handlers ───────────────────────────────────────────────────

  const generateBinCode = (
    zone: string,
    aisle: string,
    shelf: string,
    position: string
  ) => {
    const parts = [zone, aisle, shelf, position].filter(Boolean);
    return parts.length > 0 ? parts.join('-') : '';
  };

  const openBinCreate = () => {
    setEditingBin(null);
    setBinForm({ code: '', zone: '', aisle: '', shelf: '', position: '' });
    setBinDialogOpen(true);
  };

  const openBinEdit = (b: BinLocation) => {
    setEditingBin(b);
    setBinForm({
      code: b.code,
      zone: b.zone ?? '',
      aisle: b.aisle ?? '',
      shelf: b.shelf ?? '',
      position: b.position ?? '',
    });
    setBinDialogOpen(true);
  };

  const handleBinFormChange = (
    field: keyof typeof binForm,
    value: string
  ) => {
    setBinForm((prev) => {
      const next = { ...prev, [field]: value };
      if (!editingBin && field !== 'code') {
        const suggested = generateBinCode(
          field === 'zone' ? value : prev.zone,
          field === 'aisle' ? value : prev.aisle,
          field === 'shelf' ? value : prev.shelf,
          field === 'position' ? value : prev.position
        );
        if (suggested) next.code = suggested;
      }
      return next;
    });
  };

  const handleBinSave = async () => {
    if (!selectedWarehouse) return;
    if (!binForm.code.trim()) {
      toast.error('请输入库位编码');
      return;
    }
    setBinSaving(true);
    try {
      const payload = {
        code: binForm.code.trim(),
        zone: binForm.zone.trim() || null,
        aisle: binForm.aisle.trim() || null,
        shelf: binForm.shelf.trim() || null,
        position: binForm.position.trim() || null,
      };
      if (editingBin) {
        await api.patch(`/warehouses/bins/${editingBin.id}`, payload);
        toast.success('库位更新成功');
      } else {
        await api.post(`/warehouses/${selectedWarehouse.id}/bins`, payload);
        toast.success('库位创建成功');
      }
      setBinDialogOpen(false);
      fetchBins(selectedWarehouse.id);
    } catch {
      toast.error(editingBin ? '更新库位失败' : '创建库位失败');
    } finally {
      setBinSaving(false);
    }
  };

  const openBinDelete = (b: BinLocation) => {
    setDeletingBin(b);
    setBinDeleteOpen(true);
  };

  const openBarcodePopup = async (text: string) => {
    setBarcodeText(text);
    setBarcodeImageUrl(null);
    setBarcodePopupOpen(true);
    setBarcodeLoading(true);
    try {
      const { data } = await api.get<string>(`/barcode/code128/dataurl`, {
        params: { text },
      });
      setBarcodeImageUrl(typeof data === 'string' ? data : null);
    } catch {
      setBarcodeImageUrl(null);
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleBinDelete = async () => {
    if (!deletingBin || !selectedWarehouse) return;
    setBinDeleting(true);
    try {
      await api.delete(`/warehouses/bins/${deletingBin.id}`);
      toast.success('库位已删除');
      setBinDeleteOpen(false);
      fetchBins(selectedWarehouse.id);
    } catch {
      toast.error('删除库位失败');
    } finally {
      setBinDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">仓库与库位管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            仓库列表：选择物理仓库；库位列表：管理该仓库内的具体货架位置（区-通道-架-位）。
            库位用于入库时指定存放位置、拣货时按货位导航。
          </p>
        </div>
        <Button onClick={openWarehouseCreate} size="sm">
          <Plus className="mr-1 size-4" />
          新增仓库
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: Warehouse list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <WarehouseIcon className="size-4" />
              仓库列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : warehouses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                暂无仓库，点击「新增仓库」创建
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {warehouses.map((w) => (
                  <Card
                    key={w.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedWarehouse?.id === w.id
                        ? 'border-primary bg-muted/50'
                        : ''
                    }`}
                    onClick={() => setSelectedWarehouse(w)}
                  >
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{w.name}</span>
                          {w.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              默认
                            </Badge>
                          )}
                          {!w.isActive && (
                            <Badge variant="outline" className="text-xs">
                              停用
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {w.code}
                          {w.city || w.country
                            ? ` · ${[w.city, w.country].filter(Boolean).join(', ')}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openWarehouseEdit(w)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openWarehouseDelete(w)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Bin locations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" />
              库位列表
              {selectedWarehouse && (
                <span className="text-muted-foreground font-normal">
                  · {selectedWarehouse.name}
                </span>
              )}
            </CardTitle>
            {selectedWarehouse && (
              <Button onClick={openBinCreate} size="sm">
                <Plus className="mr-1 size-4" />
                新增库位
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedWarehouse ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <MapPin className="mb-4 size-12 opacity-50" />
                <p>请从左侧选择一个仓库以查看库位</p>
              </div>
            ) : binsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : bins.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                该仓库暂无库位，点击「新增库位」创建
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编码</TableHead>
                    <TableHead>区</TableHead>
                    <TableHead>通道</TableHead>
                    <TableHead>货架</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>条码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bins.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.code}</TableCell>
                      <TableCell>{b.zone ?? '-'}</TableCell>
                      <TableCell>{b.aisle ?? '-'}</TableCell>
                      <TableCell>{b.shelf ?? '-'}</TableCell>
                      <TableCell>{b.position ?? '-'}</TableCell>
                      <TableCell>
                        {b.barcode ? (
                          <button
                            type="button"
                            onClick={() => openBarcodePopup(b.barcode!)}
                            className="flex items-center gap-1 text-primary hover:underline"
                            title="点击查看条码"
                          >
                            <QrCode className="size-3.5" />
                            <span className="truncate max-w-[80px]">
                              {b.barcode}
                            </span>
                          </button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.isActive ? 'default' : 'outline'}>
                          {b.isActive ? '启用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openBinEdit(b)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openBinDelete(b)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warehouse form dialog */}
      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? '编辑仓库' : '新增仓库'}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse
                ? '修改仓库信息后点击保存'
                : '填写仓库信息后点击保存'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="wh-name">名称</Label>
              <Input
                id="wh-name"
                value={warehouseForm.name}
                onChange={(e) =>
                  setWarehouseForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="仓库名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wh-code">编码</Label>
              <Input
                id="wh-code"
                value={warehouseForm.code}
                onChange={(e) =>
                  setWarehouseForm((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="仓库编码"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wh-address">地址</Label>
              <Input
                id="wh-address"
                value={warehouseForm.address}
                onChange={(e) =>
                  setWarehouseForm((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="详细地址"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wh-city">城市</Label>
                <Input
                  id="wh-city"
                  value={warehouseForm.city}
                  onChange={(e) =>
                    setWarehouseForm((p) => ({ ...p, city: e.target.value }))
                  }
                  placeholder="城市"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wh-country">国家</Label>
                <Input
                  id="wh-country"
                  value={warehouseForm.country}
                  onChange={(e) =>
                    setWarehouseForm((p) => ({ ...p, country: e.target.value }))
                  }
                  placeholder="国家"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="wh-default"
                checked={warehouseForm.isDefault}
                onCheckedChange={(checked) =>
                  setWarehouseForm((p) => ({
                    ...p,
                    isDefault: checked === true,
                  }))
                }
              />
              <Label htmlFor="wh-default" className="cursor-pointer">
                设为默认仓库
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWarehouseDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleWarehouseSave} disabled={warehouseSaving}>
              {warehouseSaving && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse delete confirmation */}
      <Dialog open={warehouseDeleteOpen} onOpenChange={setWarehouseDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除仓库「{deletingWarehouse?.name}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWarehouseDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleWarehouseDelete}
              disabled={warehouseDeleting}
            >
              {warehouseDeleting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bin form dialog */}
      <Dialog open={binDialogOpen} onOpenChange={setBinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBin ? '编辑库位' : '新增库位'}
            </DialogTitle>
            <DialogDescription>
              {editingBin
                ? '修改库位信息后点击保存，编码可根据区/通道/货架/位置自动生成'
                : '填写库位信息，编码可根据区/通道/货架/位置自动生成'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bin-code">编码</Label>
              <Input
                id="bin-code"
                value={binForm.code}
                onChange={(e) => setBinForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="如 A-01-02-03"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bin-zone">区</Label>
                <Input
                  id="bin-zone"
                  value={binForm.zone}
                  onChange={(e) => handleBinFormChange('zone', e.target.value)}
                  placeholder="A"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bin-aisle">通道</Label>
                <Input
                  id="bin-aisle"
                  value={binForm.aisle}
                  onChange={(e) => handleBinFormChange('aisle', e.target.value)}
                  placeholder="01"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bin-shelf">货架</Label>
                <Input
                  id="bin-shelf"
                  value={binForm.shelf}
                  onChange={(e) => handleBinFormChange('shelf', e.target.value)}
                  placeholder="02"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bin-position">位置</Label>
                <Input
                  id="bin-position"
                  value={binForm.position}
                  onChange={(e) => handleBinFormChange('position', e.target.value)}
                  placeholder="03"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBinDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBinSave} disabled={binSaving}>
              {binSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode preview dialog */}
      <Dialog open={barcodePopupOpen} onOpenChange={setBarcodePopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>货位条码</DialogTitle>
            <DialogDescription>
              货位 {barcodeText} 的 Code128 条码，可用于打印标签或 PDA 扫码
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {barcodeLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : barcodeImageUrl ? (
              <>
                <img
                  src={barcodeImageUrl}
                  alt={`条码 ${barcodeText}`}
                  className="max-h-24 w-full object-contain"
                />
                <p className="text-center text-sm text-muted-foreground font-mono">
                  {barcodeText}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">加载失败</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bin delete confirmation */}
      <Dialog open={binDeleteOpen} onOpenChange={setBinDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除库位「{deletingBin?.code}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBinDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleBinDelete}
              disabled={binDeleting}
            >
              {binDeleting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
