// Updated: 2026-02-28T10:10:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Truck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface Supplier {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SupplierFormData {
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  paymentTerms: string;
  leadTimeDays: string;
}

const emptyForm: SupplierFormData = {
  name: '',
  code: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  country: '',
  paymentTerms: '',
  leadTimeDays: '',
};

const PAGE_SIZE = 10;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/suppliers', {
        params: {
          search: searchQuery.trim() || undefined,
          page,
          limit: PAGE_SIZE,
        },
      });
      setSuppliers(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('获取供应商列表失败');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  const handleOpenCreate = useCallback(() => {
    setEditingSupplier(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      code: supplier.code,
      contactName: supplier.contactName ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      country: supplier.country ?? '',
      paymentTerms: supplier.paymentTerms ?? '',
      leadTimeDays: supplier.leadTimeDays != null ? String(supplier.leadTimeDays) : '',
    });
    setDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('请输入供应商名称');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('请输入供应商编码');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        contactName: formData.contactName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        country: formData.country.trim() || undefined,
        paymentTerms: formData.paymentTerms.trim() || undefined,
        leadTimeDays:
          formData.leadTimeDays.trim() !== ''
            ? Number(formData.leadTimeDays) || undefined
            : undefined,
      };

      if (editingSupplier) {
        await api.patch(`/suppliers/${editingSupplier.id}`, payload);
        toast.success('供应商更新成功');
      } else {
        await api.post('/suppliers', payload);
        toast.success('供应商创建成功');
      }

      setDialogOpen(false);
      await fetchSuppliers();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '操作失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingSupplier, fetchSuppliers]);

  const handleDelete = useCallback(async () => {
    if (!deletingSupplier) return;
    try {
      setSubmitting(true);
      await api.delete(`/suppliers/${deletingSupplier.id}`);
      toast.success('供应商删除成功');
      setDeleteDialogOpen(false);
      setDeletingSupplier(null);
      await fetchSuppliers();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '删除失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [deletingSupplier, fetchSuppliers]);

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchSuppliers();
  }, [fetchSuppliers]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Truck className="h-6 w-6" />
            供应商管理
          </h1>
          <p className="text-muted-foreground">
            管理供应商信息，包括联系方式、交货周期等
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建供应商
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>供应商列表</CardTitle>
              <CardDescription>
                共 {total} 个供应商
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索供应商名称或编码..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                搜索
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">暂无供应商</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击「新建供应商」按钮创建第一个供应商
              </p>
              <Button onClick={handleOpenCreate} className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                新建供应商
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>供应商编码</TableHead>
                    <TableHead>供应商名称</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>国家</TableHead>
                    <TableHead>交货周期</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {supplier.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.contactName ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.email ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.phone ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.country ?? '-'}
                      </TableCell>
                      <TableCell>
                        {supplier.leadTimeDays != null ? (
                          <span>{supplier.leadTimeDays} 天</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(supplier)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">编辑</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(supplier)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">删除</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? '编辑供应商' : '新建供应商'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? '修改供应商信息后点击保存'
                : '填写供应商信息以创建新的供应商'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4 pr-1">
            <div className="grid gap-2">
              <Label htmlFor="supplier-name">
                供应商名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="supplier-name"
                placeholder="例如：XX科技公司"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-code">
                供应商编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="supplier-code"
                placeholder="例如：SUP001"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-contactName">联系人</Label>
              <Input
                id="supplier-contactName"
                placeholder="例如：张三"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactName: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-email">邮箱</Label>
              <Input
                id="supplier-email"
                type="email"
                placeholder="例如：contact@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-phone">电话</Label>
              <Input
                id="supplier-phone"
                placeholder="例如：+86 123 4567 8900"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-address">地址</Label>
              <Input
                id="supplier-address"
                placeholder="例如：北京市朝阳区XX路XX号"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-country">国家</Label>
              <Input
                id="supplier-country"
                placeholder="例如：中国"
                value={formData.country}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-paymentTerms">付款条款</Label>
              <Input
                id="supplier-paymentTerms"
                placeholder="例如：月结30天"
                value={formData.paymentTerms}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentTerms: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier-leadTimeDays">交货周期（天）</Label>
              <Input
                id="supplier-leadTimeDays"
                type="number"
                min={0}
                placeholder="例如：7"
                value={formData.leadTimeDays}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    leadTimeDays: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {editingSupplier ? '保存修改' : '创建供应商'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除供应商「{deletingSupplier?.name}」吗？此操作为软删除，可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
