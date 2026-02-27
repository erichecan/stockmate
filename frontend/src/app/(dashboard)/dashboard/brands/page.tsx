// Updated: 2026-02-27T04:40:00
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Loader2,
  Search,
  PackageOpen,
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

interface Brand {
  id: string;
  name: string;
  code: string;
  tenantId: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BrandFormData {
  name: string;
  code: string;
  logoUrl: string;
}

const emptyForm: BrandFormData = {
  name: '',
  code: '',
  logoUrl: '',
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/brands');
      setBrands(data);
    } catch {
      toast.error('获取品牌列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter(
      (brand) =>
        brand.name.toLowerCase().includes(query) ||
        brand.code.toLowerCase().includes(query),
    );
  }, [brands, searchQuery]);

  const handleOpenCreate = useCallback(() => {
    setEditingBrand(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      code: brand.code,
      logoUrl: brand.logoUrl || '',
    });
    setDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((brand: Brand) => {
    setDeletingBrand(brand);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('请输入品牌名称');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('请输入品牌编码');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        logoUrl: formData.logoUrl.trim() || undefined,
      };

      if (editingBrand) {
        await api.patch(`/brands/${editingBrand.id}`, payload);
        toast.success('品牌更新成功');
      } else {
        await api.post('/brands', payload);
        toast.success('品牌创建成功');
      }

      setDialogOpen(false);
      await fetchBrands();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '操作失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingBrand, fetchBrands]);

  const handleDelete = useCallback(async () => {
    if (!deletingBrand) return;
    try {
      setSubmitting(true);
      await api.delete(`/brands/${deletingBrand.id}`);
      toast.success('品牌删除成功');
      setDeleteDialogOpen(false);
      setDeletingBrand(null);
      await fetchBrands();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '删除失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [deletingBrand, fetchBrands]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Tag className="h-6 w-6" />
            品牌管理
          </h1>
          <p className="text-muted-foreground">
            管理产品品牌信息，包括品牌名称、编码和 Logo
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建品牌
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>品牌列表</CardTitle>
              <CardDescription>
                共 {brands.length} 个品牌
                {searchQuery && `，筛选显示 ${filteredBrands.length} 个`}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索品牌名称或编码..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : brands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">暂无品牌</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击「新建品牌」按钮创建第一个产品品牌
              </p>
              <Button onClick={handleOpenCreate} className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                新建品牌
              </Button>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">未找到匹配的品牌</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                尝试使用其他关键词搜索
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>品牌名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead>Logo URL</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {brand.code}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {brand.logoUrl || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={brand.isActive ? 'default' : 'secondary'}>
                        {brand.isActive ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(brand.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(brand)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">编辑</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(brand)}
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? '编辑品牌' : '新建品牌'}
            </DialogTitle>
            <DialogDescription>
              {editingBrand
                ? '修改品牌信息后点击保存'
                : '填写品牌信息以创建新的产品品牌'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="brand-name">
                品牌名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand-name"
                placeholder="例如：Apple"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brand-code">
                品牌编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand-code"
                placeholder="例如：APPLE"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brand-logo">Logo URL</Label>
              <Input
                id="brand-logo"
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))
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
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editingBrand ? '保存修改' : '创建品牌'}
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
              确定要删除品牌「{deletingBrand?.name}」吗？此操作不可撤销。
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
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
