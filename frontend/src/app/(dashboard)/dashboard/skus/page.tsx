// Updated: 2026-02-27T04:40:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  Barcode,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────

interface Sku {
  id: string;
  code: string;
  productId: string;
  tenantId: string;
  variantAttributes: Record<string, string>;
  barcode: string | null;
  costPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  weight: number | null;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; nameEn?: string | null };
}

// ─── Helpers ─────────────────────────────────────────────

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '-';
  return `¥${Number(price).toFixed(2)}`;
}

const PAGE_SIZE = 20;

// ─── Component ───────────────────────────────────────────

export default function SkusPage() {
  // SKU list
  const [skus, setSkus] = useState<Sku[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<Sku | null>(null);
  const [editForm, setEditForm] = useState({
    costPrice: '',
    wholesalePrice: '',
    retailPrice: '',
    weight: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSku, setDeletingSku] = useState<Sku | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Data Fetching ───

  const fetchSkus = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/skus', {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(search && { search }),
        },
      });
      setSkus(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      toast.error('加载 SKU 列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSkus();
  }, [fetchSkus]);

  // ─── Edit Handlers ───

  const openEditDialog = (sku: Sku) => {
    setEditingSku(sku);
    setEditForm({
      costPrice: sku.costPrice?.toString() ?? '',
      wholesalePrice: sku.wholesalePrice?.toString() ?? '',
      retailPrice: sku.retailPrice?.toString() ?? '',
      weight: sku.weight?.toString() ?? '',
      isActive: sku.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingSku) return;
    setSaving(true);
    try {
      await api.patch(`/skus/${editingSku.id}`, {
        ...(editForm.costPrice !== '' && {
          costPrice: Number(editForm.costPrice),
        }),
        ...(editForm.wholesalePrice !== '' && {
          wholesalePrice: Number(editForm.wholesalePrice),
        }),
        ...(editForm.retailPrice !== '' && {
          retailPrice: Number(editForm.retailPrice),
        }),
        ...(editForm.weight !== '' && {
          weight: Number(editForm.weight),
        }),
        isActive: editForm.isActive,
      });
      toast.success('SKU 更新成功');
      setEditDialogOpen(false);
      fetchSkus();
    } catch {
      toast.error('更新 SKU 失败');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Handlers ───

  const openDeleteDialog = (sku: Sku) => {
    setDeletingSku(sku);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSku) return;
    setDeleting(true);
    try {
      await api.delete(`/skus/${deletingSku.id}`);
      toast.success('SKU 已删除');
      setDeleteDialogOpen(false);
      fetchSkus();
    } catch {
      toast.error('删除 SKU 失败');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Derived Values ───

  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SKU 管理</h1>
        <p className="text-muted-foreground">
          查看和管理所有产品的 SKU（库存单位）信息。
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索 SKU 编码或产品名称..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setPage(1);
            }}
          >
            <X className="h-4 w-4" />
            清除
          </Button>
        )}
      </div>

      {/* SKU Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU 编码</TableHead>
              <TableHead>产品名称</TableHead>
              <TableHead>变体属性</TableHead>
              <TableHead className="text-right">成本价</TableHead>
              <TableHead className="text-right">批发价</TableHead>
              <TableHead className="text-right">零售价</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : skus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Barcode className="h-10 w-10" />
                    <p>暂无 SKU 数据</p>
                    {search && (
                      <p className="text-xs">尝试修改搜索条件</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              skus.map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono font-semibold">
                    {sku.code}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {sku.product?.name ?? sku.productId}
                      </p>
                      {sku.product?.nameEn && (
                        <p className="text-xs text-muted-foreground">
                          {sku.product.nameEn}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(sku.variantAttributes ?? {}).map(
                        ([k, v]) => (
                          <Badge
                            key={k}
                            variant="outline"
                            className="text-xs"
                          >
                            {k}: {v}
                          </Badge>
                        ),
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(sku.costPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(sku.wholesalePrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(sku.retailPrice)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={sku.isActive ? 'default' : 'secondary'}
                      className={sku.isActive ? 'bg-green-600' : undefined}
                    >
                      {sku.isActive ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(sku)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => openDeleteDialog(sku)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && !loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            显示 {total > 0 ? `${startItem}-${endItem}` : '0'} / 共 {total} 条
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

      {/* ═══ Edit SKU Dialog ═══ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑 SKU</DialogTitle>
            <DialogDescription>
              编辑 SKU: {editingSku?.code}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Variant attributes (read-only) */}
            {editingSku && (
              <div className="space-y-2">
                <Label>变体属性</Label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(editingSku.variantAttributes ?? {}).map(
                    ([k, v]) => (
                      <Badge key={k} variant="outline">
                        {k}: {v}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Editable price fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>成本价</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.costPrice}
                  onChange={(e) =>
                    setEditForm({ ...editForm, costPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>批发价</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.wholesalePrice}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      wholesalePrice: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>零售价</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.retailPrice}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      retailPrice: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>重量 (g)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.weight}
                  onChange={(e) =>
                    setEditForm({ ...editForm, weight: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={editForm.isActive ? 'true' : 'false'}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, isActive: v === 'true' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete SKU Dialog ═══ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除 SKU</DialogTitle>
            <DialogDescription>
              确定要删除 SKU「{deletingSku?.code}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
