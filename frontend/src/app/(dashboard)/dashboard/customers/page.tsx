// Phase 3: 客户管理页面
// Updated: 2026-02-28T14:10:00
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Users,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIER_LABELS: Record<string, string> = {
  NORMAL: '标准',
  SILVER: '银牌',
  GOLD: '金牌',
  VIP: 'VIP',
};

interface Customer {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tier: string;
  isActive: boolean;
  notes?: string | null;
  orderCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFormData {
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tier: string;
  notes: string;
}

const emptyForm: CustomerFormData = {
  name: '',
  code: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  tier: 'NORMAL',
  notes: '',
};

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/customers', {
        params: {
          search: searchQuery.trim() || undefined,
          page,
          limit: PAGE_SIZE,
        },
      });
      setCustomers(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  const handleOpenCreate = useCallback(() => {
    setEditingCustomer(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      code: customer.code,
      contactName: customer.contactName ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      country: customer.country ?? '',
      tier: customer.tier,
      notes: customer.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('请输入客户名称');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('请输入客户编码');
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
        city: formData.city.trim() || undefined,
        country: formData.country.trim() || undefined,
        tier: formData.tier,
        notes: formData.notes.trim() || undefined,
      };

      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer.id}`, payload);
        toast.success('客户更新成功');
      } else {
        await api.post('/customers', payload);
        toast.success('客户创建成功');
      }

      setDialogOpen(false);
      await fetchCustomers();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '操作失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingCustomer, fetchCustomers]);

  const handleDelete = useCallback(async () => {
    if (!deletingCustomer) return;
    try {
      setSubmitting(true);
      await api.delete(`/customers/${deletingCustomer.id}`);
      toast.success('客户已停用');
      setDeleteDialogOpen(false);
      setDeletingCustomer(null);
      await fetchCustomers();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '删除失败，请重试';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [deletingCustomer, fetchCustomers]);

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6" />
            客户管理
          </h1>
          <p className="text-muted-foreground">
            管理批发客户信息，客户分级影响批发价格
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建客户
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>客户列表</CardTitle>
              <CardDescription>共 {total} 个客户</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索客户名称或编码..."
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
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">暂无客户</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击「新建客户」按钮创建第一个客户
              </p>
              <Button onClick={handleOpenCreate} className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                新建客户
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>客户编码</TableHead>
                    <TableHead>客户名称</TableHead>
                    <TableHead>联系人</TableHead>
                    <TableHead>等级</TableHead>
                    <TableHead>城市</TableHead>
                    <TableHead>国家</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {customer.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.contactName ?? '-'}
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {TIER_LABELS[customer.tier] ?? customer.tier}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.city ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.country ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">编辑</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(customer)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">停用</span>
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
              {editingCustomer ? '编辑客户' : '新建客户'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? '修改客户信息后点击保存'
                : '填写客户信息以创建新的批发客户'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4 pr-1">
            <div className="grid gap-2">
              <Label htmlFor="customer-name">
                客户名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-name"
                placeholder="例如：Tech Retail GmbH"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-code">
                客户编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-code"
                placeholder="例如：CUST-001"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                disabled={!!editingCustomer}
              />
            </div>

            <div className="grid gap-2">
              <Label>客户等级</Label>
              <Select
                value={formData.tier}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, tier: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                等级影响批发价：NORMAL 100%，SILVER 98%，GOLD 95%，VIP 90%
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-contactName">联系人</Label>
              <Input
                id="customer-contactName"
                placeholder="例如：Maria Schmidt"
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
              <Label htmlFor="customer-email">邮箱</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="order@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-phone">电话</Label>
              <Input
                id="customer-phone"
                placeholder="+49-30-1234567"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-address">地址</Label>
              <Input
                id="customer-address"
                placeholder="街道地址"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customer-city">城市</Label>
                <Input
                  id="customer-city"
                  placeholder="Berlin"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer-country">国家</Label>
                <Input
                  id="customer-country"
                  placeholder="Germany"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer-notes">备注</Label>
              <Input
                id="customer-notes"
                placeholder="可选"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
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
              {editingCustomer ? '保存修改' : '创建客户'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认停用</DialogTitle>
            <DialogDescription>
              确定要停用客户「{deletingCustomer?.name}」吗？此操作为软停用，可恢复。
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
              确认停用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
