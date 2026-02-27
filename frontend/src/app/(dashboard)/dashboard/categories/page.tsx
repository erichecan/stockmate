// Updated: 2026-02-27T04:40:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  List,
  TreePine,
  Loader2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
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

interface Category {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  parentId: string | null;
  tenantId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  nameEn: string;
  code: string;
  parentId: string;
  sortOrder: string;
}

const emptyForm: CategoryFormData = {
  name: '',
  nameEn: '',
  code: '',
  parentId: '',
  sortOrder: '0',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [treeCategories, setTreeCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTreeView, setIsTreeView] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const [flatRes, treeRes] = await Promise.all([
        api.get('/categories'),
        api.get('/categories?tree=true'),
      ]);
      setCategories(flatRes.data);
      setTreeCategories(treeRes.data);
    } catch {
      toast.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const findParentName = useCallback(
    (parentId: string | null): string => {
      if (!parentId) return '-';
      const parent = categories.find((c) => c.id === parentId);
      return parent ? parent.name : '-';
    },
    [categories],
  );

  const handleOpenCreate = useCallback(() => {
    setEditingCategory(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      nameEn: category.nameEn || '',
      code: category.code,
      parentId: category.parentId || '',
      sortOrder: String(category.sortOrder),
    });
    setDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((category: Category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('请输入分类编码');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        nameEn: formData.nameEn.trim() || undefined,
        code: formData.code.trim(),
        parentId: formData.parentId || undefined,
        sortOrder: Number(formData.sortOrder) || 0,
      };

      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, payload);
        toast.success('分类更新成功');
      } else {
        await api.post('/categories', payload);
        toast.success('分类创建成功');
      }

      setDialogOpen(false);
      await fetchCategories();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '操作失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingCategory, fetchCategories]);

  const handleDelete = useCallback(async () => {
    if (!deletingCategory) return;
    try {
      setSubmitting(true);
      await api.delete(`/categories/${deletingCategory.id}`);
      toast.success('分类删除成功');
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      await fetchCategories();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '删除失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [deletingCategory, fetchCategories]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const availableParents = editingCategory
    ? categories.filter((c) => c.id !== editingCategory.id)
    : categories;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FolderTree className="h-6 w-6" />
            分类管理
          </h1>
          <p className="text-muted-foreground">
            管理产品分类，支持多级分类结构
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTreeView(!isTreeView)}
          >
            {isTreeView ? (
              <>
                <List className="mr-1.5 h-4 w-4" />
                列表视图
              </>
            ) : (
              <>
                <TreePine className="mr-1.5 h-4 w-4" />
                树形视图
              </>
            )}
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            新建分类
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>分类列表</CardTitle>
          <CardDescription>
            共 {categories.length} 个分类
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">暂无分类</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击「新建分类」按钮创建第一个产品分类
              </p>
              <Button onClick={handleOpenCreate} className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                新建分类
              </Button>
            </div>
          ) : isTreeView ? (
            <TreeView
              categories={treeCategories}
              expandedIds={expandedIds}
              onToggle={toggleExpand}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分类名称</TableHead>
                  <TableHead>英文名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead>父分类</TableHead>
                  <TableHead className="text-center">排序</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.nameEn || '-'}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {category.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {findParentName(category.parentId)}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.sortOrder}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">编辑</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(category)}
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
              {editingCategory ? '编辑分类' : '新建分类'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? '修改分类信息后点击保存'
                : '填写分类信息以创建新的产品分类'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                分类名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例如：手机壳"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nameEn">英文名称</Label>
              <Input
                id="nameEn"
                placeholder="e.g. Phone Cases"
                value={formData.nameEn}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nameEn: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code">
                分类编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="例如：PHONE_CASE"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="parentId">父分类</Label>
              <Select
                value={formData.parentId || 'none'}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    parentId: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择父分类（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无（顶级分类）</SelectItem>
                  {availableParents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                placeholder="0"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sortOrder: e.target.value,
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
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editingCategory ? '保存修改' : '创建分类'}
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
              确定要删除分类「{deletingCategory?.name}」吗？此操作不可撤销。
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

function TreeView({
  categories,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  depth = 0,
}: {
  categories: Category[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  depth?: number;
}) {
  return (
    <div className={depth === 0 ? 'space-y-0.5' : 'mt-0.5 space-y-0.5'}>
      {categories.map((category) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedIds.has(category.id);

        return (
          <div key={category.id}>
            <div
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
              style={{ paddingLeft: `${depth * 24 + 8}px` }}
            >
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center"
                onClick={() => hasChildren && onToggle(category.id)}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <span className="h-4 w-4" />
                )}
              </button>

              <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />

              <span className="flex-1 truncate text-sm font-medium">
                {category.name}
                {category.nameEn && (
                  <span className="ml-2 text-muted-foreground">
                    ({category.nameEn})
                  </span>
                )}
              </span>

              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {category.code}
              </code>

              <Badge
                variant={category.isActive ? 'default' : 'secondary'}
                className="text-[10px]"
              >
                {category.isActive ? '启用' : '停用'}
              </Badge>

              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(category)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(category)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {hasChildren && isExpanded && (
              <TreeView
                categories={category.children!}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
