// 打印方案：出库单、入库单、拣货单模板管理；参考 ModernWMS PrintSolution
// Updated: 2026-03-14
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Printer,
  FileText,
  PackageCheck,
  ClipboardList,
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
import { Badge } from '@/components/ui/badge';

const DOCUMENT_TYPES = [
  { value: 'OUTBOUND_SHEET', label: '出库单', icon: FileText },
  { value: 'INBOUND_SHEET', label: '入库单', icon: PackageCheck },
  { value: 'PICK_LIST', label: '拣货单', icon: ClipboardList },
] as const;

const PLACEHOLDERS: Record<string, string[]> = {
  OUTBOUND_SHEET: ['{{orderNumber}}', '{{customerName}}', '{{shipDate}}', '{{items}}', '{{totalQty}}'],
  INBOUND_SHEET: ['{{receiptNumber}}', '{{supplierName}}', '{{receivedAt}}', '{{items}}', '{{totalQty}}'],
  PICK_LIST: ['{{orderNumber}}', '{{warehouseName}}', '{{items}}', '{{binLocation}}', '{{skuCode}}', '{{qty}}'],
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  OUTBOUND_SHEET: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>出库单</title></head><body style="font-family: sans-serif; padding: 16px;">
<h2>出库单</h2>
<p>单号：{{orderNumber}} | 客户：{{customerName}} | 发货日期：{{shipDate}}</p>
<table border="1" cellpadding="8" style="width:100%; border-collapse: collapse;">
<thead><tr><th>SKU</th><th>品名</th><th>数量</th></tr></thead>
<tbody>{{items}}</tbody>
</table>
<p>总数量：{{totalQty}}</p>
</body></html>`,
  INBOUND_SHEET: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>入库单</title></head><body style="font-family: sans-serif; padding: 16px;">
<h2>入库单</h2>
<p>单号：{{receiptNumber}} | 供应商：{{supplierName}} | 收货日期：{{receivedAt}}</p>
<table border="1" cellpadding="8" style="width:100%; border-collapse: collapse;">
<thead><tr><th>SKU</th><th>品名</th><th>数量</th></tr></thead>
<tbody>{{items}}</tbody>
</table>
<p>总数量：{{totalQty}}</p>
</body></html>`,
  PICK_LIST: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>拣货单</title></head><body style="font-family: sans-serif; padding: 16px;">
<h2>拣货单</h2>
<p>订单号：{{orderNumber}} | 仓库：{{warehouseName}}</p>
<table border="1" cellpadding="8" style="width:100%; border-collapse: collapse;">
<thead><tr><th>货位</th><th>SKU</th><th>品名</th><th>数量</th></tr></thead>
<tbody>{{items}}</tbody>
</table>
</body></html>`,
};

interface PrintSolution {
  id: string;
  documentType: string;
  name: string;
  templateBody: string;
  reportWidthMm: number | null;
  reportHeightMm: number | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  documentType: string;
  name: string;
  templateBody: string;
  reportWidthMm: string;
  reportHeightMm: string;
  isDefault: boolean;
}

const PAGE_SIZE = 10;

export default function PrintSolutionsPage() {
  const [list, setList] = useState<PrintSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrintSolution | null>(null);
  const [deleting, setDeleting] = useState<PrintSolution | null>(null);
  const [formData, setFormData] = useState<FormData>({
    documentType: 'OUTBOUND_SHEET',
    name: '',
    templateBody: '',
    reportWidthMm: '',
    reportHeightMm: '',
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (documentTypeFilter) params.documentType = documentTypeFilter;
      const { data } = await api.get('/print-solutions', { params });
      setList(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('获取打印方案列表失败');
    } finally {
      setLoading(false);
    }
  }, [documentTypeFilter, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleOpenCreate = (type?: string) => {
    setEditing(null);
    const docType = type || documentTypeFilter || 'OUTBOUND_SHEET';
    setFormData({
      documentType: docType,
      name: '',
      templateBody: DEFAULT_TEMPLATES[docType] ?? '',
      reportWidthMm: '210',
      reportHeightMm: '297',
      isDefault: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (row: PrintSolution) => {
    setEditing(row);
    setFormData({
      documentType: row.documentType,
      name: row.name,
      templateBody: row.templateBody,
      reportWidthMm: row.reportWidthMm != null ? String(row.reportWidthMm) : '',
      reportHeightMm: row.reportHeightMm != null ? String(row.reportHeightMm) : '',
      isDefault: row.isDefault,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入方案名称');
      return;
    }
    if (!formData.templateBody.trim()) {
      toast.error('请输入模板内容');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        documentType: formData.documentType,
        name: formData.name.trim(),
        templateBody: formData.templateBody.trim(),
        reportWidthMm: formData.reportWidthMm ? Number(formData.reportWidthMm) : undefined,
        reportHeightMm: formData.reportHeightMm ? Number(formData.reportHeightMm) : undefined,
        isDefault: formData.isDefault,
      };
      if (editing) {
        await api.patch(`/print-solutions/${editing.id}`, payload);
        toast.success('打印方案已更新');
      } else {
        await api.post('/print-solutions', payload);
        toast.success('打印方案已创建');
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
      await api.delete(`/print-solutions/${deleting.id}`);
      toast.success('打印方案已删除');
      setDeleteDialogOpen(false);
      setDeleting(null);
      fetchList();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '删除失败');
    }
  };

  const docTypeLabel = (value: string) => DOCUMENT_TYPES.find((d) => d.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">打印方案</h1>
        <p className="text-muted-foreground">
          管理出库单、入库单、拣货单的打印模板，支持占位符（如 {'{{orderNumber}}'}）在打印时替换为实际数据。
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>方案列表</CardTitle>
          <div className="flex gap-2">
            {DOCUMENT_TYPES.map((d) => (
              <Button key={d.value} variant="outline" size="sm" onClick={() => handleOpenCreate(d.value)}>
                <d.icon className="h-4 w-4" />
                {d.label}模板
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Select value={documentTypeFilter || 'all'} onValueChange={(v) => setDocumentTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="单据类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {DOCUMENT_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              暂无打印方案。可点击上方「出库单模板」「入库单模板」「拣货单模板」创建默认模板。
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>方案名称</TableHead>
                    <TableHead>纸张 (mm)</TableHead>
                    <TableHead>默认</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant="outline">{docTypeLabel(row.documentType)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.reportWidthMm != null && row.reportHeightMm != null
                          ? `${row.reportWidthMm} × ${row.reportHeightMm}`
                          : '-'}
                      </TableCell>
                      <TableCell>{row.isDefault ? '是' : '-'}</TableCell>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑打印方案' : '新建打印方案'}</DialogTitle>
            <DialogDescription>
              模板为 HTML，可使用占位符：{PLACEHOLDERS[formData.documentType]?.join(' ')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto">
            <div className="grid gap-2">
              <Label>单据类型</Label>
              <Select
                value={formData.documentType}
                onValueChange={(v) =>
                  setFormData((f) => ({
                    ...f,
                    documentType: v,
                    templateBody: f.templateBody || DEFAULT_TEMPLATES[v] || '',
                  }))
                }
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>方案名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="例如：默认出库单"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>纸张宽度 (mm)</Label>
                <Input
                  type="number"
                  value={formData.reportWidthMm}
                  onChange={(e) => setFormData((f) => ({ ...f, reportWidthMm: e.target.value }))}
                  placeholder="210"
                />
              </div>
              <div className="grid gap-2">
                <Label>纸张高度 (mm)</Label>
                <Input
                  type="number"
                  value={formData.reportHeightMm}
                  onChange={(e) => setFormData((f) => ({ ...f, reportHeightMm: e.target.value }))}
                  placeholder="297"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              <Label htmlFor="isDefault">设为该类型默认方案</Label>
            </div>
            <div className="grid gap-2">
              <Label>模板内容 (HTML) *</Label>
              <textarea
                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                value={formData.templateBody}
                onChange={(e) => setFormData((f) => ({ ...f, templateBody: e.target.value }))}
                placeholder="<html>..."
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
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
            <DialogDescription>确定要删除打印方案「{deleting?.name}」吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
