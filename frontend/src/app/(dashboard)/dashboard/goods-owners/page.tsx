// 货主管理；参考 ModernWMS view/base/ownerOfCargo
// Updated: 2026-03-14
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  UserCircle,
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
import { Badge } from '@/components/ui/badge';

interface GoodsOwner {
  id: string;
  name: string;
  code: string;
  city: string | null;
  address: string | null;
  contactName: string | null;
  contactTel: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  code: string;
  city: string;
  address: string;
  contactName: string;
  contactTel: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  name: '',
  code: '',
  city: '',
  address: '',
  contactName: '',
  contactTel: '',
  isActive: true,
};

const PAGE_SIZE = 10;

export default function GoodsOwnersPage() {
  const [list, setList] = useState<GoodsOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoodsOwner | null>(null);
  const [deleting, setDeleting] = useState<GoodsOwner | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/goods-owners', {
        params: { search: searchQuery.trim() || undefined, page, limit: PAGE_SIZE },
      });
      setList(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('获取货主列表失败');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row: GoodsOwner) => {
    setEditing(row);
    setFormData({
      name: row.name,
      code: row.code,
      city: row.city ?? '',
      address: row.address ?? '',
      contactName: row.contactName ?? '',
      contactTel: row.contactTel ?? '',
      isActive: row.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入货主名称');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('请输入货主编码');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        city: formData.city.trim() || undefined,
        address: formData.address.trim() || undefined,
        contactName: formData.contactName.trim() || undefined,
        contactTel: formData.contactTel.trim() || undefined,
        isActive: formData.isActive,
      };
      if (editing) {
        await api.patch(`/goods-owners/${editing.id}`, payload);
        toast.success('货主已更新');
      } else {
        await api.post('/goods-owners', payload);
        toast.success('货主已创建');
      }
      setDialogOpen(false);
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (editing ? '更新失败' : '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/goods-owners/${deleting.id}`);
      toast.success('货主已删除');
      setDeleteDialogOpen(false);
      setDeleting(null);
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">货主</h1>
        <p className="text-muted-foreground">一仓多货主、代管等场景下的货主档案。</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>货主列表</CardTitle>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            新建货主
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索名称、编码、联系人..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">暂无货主，点击「新建货主」添加。</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编码</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>城市</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.contactName ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.contactTel ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.city ?? '-'}</TableCell>
                      <TableCell>
                        {row.isActive ? (
                          <Badge variant="default">启用</Badge>
                        ) : (
                          <Badge variant="secondary">停用</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            setDeleting(row);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">共 {total} 条</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑货主' : '新建货主'}</DialogTitle>
            <DialogDescription>货主编码在同一租户下不可重复。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>名称 *</Label>
              <Input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} placeholder="货主名称" />
            </div>
            <div className="grid gap-2">
              <Label>编码 *</Label>
              <Input value={formData.code} onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))} placeholder="GO-001" disabled={!!editing} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>联系人</Label>
                <Input value={formData.contactName} onChange={(e) => setFormData((f) => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>电话</Label>
                <Input value={formData.contactTel} onChange={(e) => setFormData((f) => ({ ...f, contactTel: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>城市</Label>
              <Input value={formData.city} onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>地址</Label>
              <Input value={formData.address} onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))} />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <Label htmlFor="isActive">启用</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除货主「{deleting?.name}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
