'use client';
// Updated: 2026-03-18T23:00:05 - 管理端 MOQ 批量修改页

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SkuRow = {
  id: string;
  code: string;
  moq?: number | null;
  minOrderQty?: number | null;
  product?: { name?: string | null; nameEn?: string | null };
};

export default function AdminMoqPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [bulkMoq, setBulkMoq] = useState('1');
  const [rows, setRows] = useState<SkuRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/skus', {
        params: { page: 1, limit: 100, search: search.trim() || undefined },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setRows(list);
    } catch {
      toast.error('加载 SKU 失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const selectedIds = useMemo(
    () => rows.filter((r) => selected[r.id]).map((r) => r.id),
    [rows, selected],
  );

  const allChecked = rows.length > 0 && rows.every((r) => selected[r.id]);

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    rows.forEach((r) => {
      next[r.id] = checked;
    });
    setSelected(next);
  };

  const applyBulk = async () => {
    const moqNum = Number(bulkMoq);
    if (!Number.isInteger(moqNum) || moqNum < 1) {
      toast.error('MOQ 必须是大于等于 1 的整数');
      return;
    }
    if (!selectedIds.length) {
      toast.error('请先勾选至少一个 SKU');
      return;
    }
    setSaving(true);
    try {
      await authApi.patch('/skus/moq/batch', {
        skuIds: selectedIds,
        moq: moqNum,
      });
      toast.success(`已批量更新 ${selectedIds.length} 个 SKU`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '批量更新失败');
    } finally {
      setSaving(false);
    }
  };

  const updateSingleMoq = async (skuId: string, moq: number) => {
    if (!Number.isInteger(moq) || moq < 1) return;
    try {
      await authApi.patch(`/skus/${skuId}/moq`, { moq });
      setRows((prev) =>
        prev.map((r) => (r.id === skuId ? { ...r, moq, minOrderQty: moq } : r)),
      );
      toast.success('单条 MOQ 已更新');
    } catch {
      toast.error('单条更新失败');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">MOQ Batch</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        商品默认 MOQ=1；可单条修改，也可批量勾选后统一修改。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">批量设置</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">搜索 SKU / 产品名</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="输入关键词"
              className="w-64"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">批量 MOQ</label>
            <Input
              type="number"
              min={1}
              value={bulkMoq}
              onChange={(e) => setBulkMoq(e.target.value)}
              className="w-32"
            />
          </div>
          <Button onClick={applyBulk} disabled={saving || !selectedIds.length}>
            {saving ? '提交中...' : `批量应用 (${selectedIds.length})`}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">SKU 列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px]">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>商品名</TableHead>
                <TableHead className="w-[180px]">MOQ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    无可用 SKU
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const resolved = Number(r.moq ?? r.minOrderQty ?? 1);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[r.id]}
                          onCheckedChange={(v) =>
                            setSelected((prev) => ({ ...prev, [r.id]: !!v }))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono">{r.code}</TableCell>
                      <TableCell>{r.product?.nameEn || r.product?.name || '-'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          defaultValue={resolved}
                          onBlur={(e) => updateSingleMoq(r.id, Number(e.target.value))}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

