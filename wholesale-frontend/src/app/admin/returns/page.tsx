// Updated: 2026-03-20T07:35:04-0400 - 合并登记/匹配、处置决策、原单核对为单一退货工作台
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';

type ReturnStatus = 'RECEIVED' | 'MATCHED' | 'DECIDED' | 'PROCESSED';
type ReturnDisposition = 'PENDING' | 'DISCARD' | 'REPAIR' | 'DISCOUNT_SALE' | 'RETAIL';
type ReturnCondition = 'UNKNOWN' | 'NEW_LIKE' | 'GOOD' | 'DAMAGED' | 'BROKEN';

type ReturnRow = {
  id: string;
  sourceOrderId?: string | null;
  sourceOrderNumber?: string | null;
  returnedQty: number;
  status: ReturnStatus;
  condition: ReturnCondition;
  disposition: ReturnDisposition;
  issueDescription?: string | null;
  intakeNotes?: string | null;
  decisionNotes?: string | null;
  sku?: { id?: string; code?: string; product?: { name?: string | null } } | null;
  sourceOrder?: {
    id?: string;
    orderNumber?: string | null;
    status?: string;
  } | null;
  createdAt: string;
};

type SalesOrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customer?: { name?: string | null };
  items?: Array<{
    skuId: string;
    quantity: number;
    sku?: { code?: string; product?: { name?: string | null } };
  }>;
};

const DISPOSITION_OPTIONS: Array<{ value: ReturnDisposition; label: string }> = [
  { value: 'PENDING', label: '待决策' },
  { value: 'DISCARD', label: '弃货' },
  { value: 'REPAIR', label: '维修' },
  { value: 'DISCOUNT_SALE', label: '降价销售' },
  { value: 'RETAIL', label: '转零售' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error)) return fallback;
  const response = error.response;
  if (!isRecord(response)) return fallback;
  const data = response.data;
  if (!isRecord(data)) return fallback;
  const message = data.message;
  return typeof message === 'string' && message.length > 0 ? message : fallback;
}

export default function AdminReturnsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [keyword, setKeyword] = useState('');

  const [sourceOrderId, setSourceOrderId] = useState('');
  const [sourceOrderNumber, setSourceOrderNumber] = useState('');
  const [skuId, setSkuId] = useState('');
  const [returnedQty, setReturnedQty] = useState('1');
  const [condition, setCondition] = useState<ReturnCondition>('UNKNOWN');
  const [issueDescription, setIssueDescription] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');

  const [selected, setSelected] = useState<ReturnRow | null>(null);
  const [decision, setDecision] = useState<ReturnDisposition>('PENDING');
  const [decisionNotes, setDecisionNotes] = useState('');

  const [orderDetail, setOrderDetail] = useState<SalesOrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/returns', {
        params: {
          page: 1,
          limit: 100,
          orderNumber: orderNumber.trim() || undefined,
          skuCode: skuCode.trim() || undefined,
          keyword: keyword.trim() || undefined,
        },
      });
      const list = Array.isArray(data?.data) ? (data.data as ReturnRow[]) : [];
      setRows(list);
      setSelected((prev) => {
        if (!prev) return null;
        return list.find((r) => r.id === prev.id) ?? null;
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '加载退货记录失败'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, orderNumber, skuCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderIdForDetail = selected?.sourceOrder?.id ?? selected?.sourceOrderId ?? null;

  useEffect(() => {
    if (!orderIdForDetail) {
      setOrderDetail(null);
      return;
    }
    let cancelled = false;
    setOrderLoading(true);
    authApi
      .get(`/sales-orders/${orderIdForDetail}`)
      .then(({ data }) => {
        if (!cancelled) setOrderDetail(data as SalesOrderDetail);
      })
      .catch(() => {
        if (!cancelled) {
          setOrderDetail(null);
          toast.error('加载原订单失败');
        }
      })
      .finally(() => {
        if (!cancelled) setOrderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderIdForDetail]);

  useEffect(() => {
    if (!selected) {
      setDecision('PENDING');
      setDecisionNotes('');
      return;
    }
    setDecision(selected.disposition);
    setDecisionNotes(selected.decisionNotes || '');
  }, [selected]);

  const selectRow = (r: ReturnRow) => {
    setSelected(r);
  };

  const createRecord = async () => {
    const qty = Number(returnedQty);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('退回数量必须是大于等于 1 的整数');
      return;
    }
    setSaving(true);
    try {
      await authApi.post('/returns', {
        sourceOrderId: sourceOrderId.trim() || undefined,
        sourceOrderNumber: sourceOrderNumber.trim() || undefined,
        skuId: skuId.trim() || undefined,
        returnedQty: qty,
        condition,
        issueDescription: issueDescription.trim() || undefined,
        intakeNotes: intakeNotes.trim() || undefined,
      });
      toast.success('退货记录已创建');
      setSourceOrderId('');
      setSourceOrderNumber('');
      setSkuId('');
      setReturnedQty('1');
      setCondition('UNKNOWN');
      setIssueDescription('');
      setIntakeNotes('');
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '创建退货记录失败'));
    } finally {
      setSaving(false);
    }
  };

  const submitDecision = async () => {
    if (!selected) {
      toast.error('请先在列表中选择一条退货记录');
      return;
    }
    setSaving(true);
    try {
      await authApi.patch(`/returns/${selected.id}/decision`, {
        disposition: decision,
        decisionNotes: decisionNotes.trim() || undefined,
      });
      toast.success('退货处置决策已更新');
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '更新处置决策失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">退货工作台</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        同一页面完成登记与匹配、查看原订单核对、提交处置决策；下方列表选中一条即可在右侧操作。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">登记与匹配（新建退回记录）</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>来源订单 ID（可选）</Label>
            <Input value={sourceOrderId} onChange={(e) => setSourceOrderId(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>来源订单号（可选）</Label>
            <Input
              value={sourceOrderNumber}
              onChange={(e) => setSourceOrderNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>SKU ID（可选）</Label>
            <Input value={skuId} onChange={(e) => setSkuId(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>退回数量</Label>
            <Input
              type="number"
              value={returnedQty}
              onChange={(e) => setReturnedQty(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>品相</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as ReturnCondition)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNKNOWN">未知</SelectItem>
                <SelectItem value="NEW_LIKE">近新</SelectItem>
                <SelectItem value="GOOD">良好</SelectItem>
                <SelectItem value="DAMAGED">损坏</SelectItem>
                <SelectItem value="BROKEN">报废</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>问题描述</Label>
            <Input value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>登记备注</Label>
            <Input value={intakeNotes} onChange={(e) => setIntakeNotes(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={createRecord} disabled={saving}>
              {saving ? '提交中...' : '登记退货'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">退货记录</CardTitle>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="订单号"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
              <Input
                placeholder="SKU 编码"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
              />
              <Input
                className="sm:col-span-2"
                placeholder="关键词（描述/备注）"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  筛选
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOrderNumber('');
                    setSkuCode('');
                    setKeyword('');
                  }}
                >
                  清空
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无退货记录</p>
            ) : (
              <ul className="max-h-[min(70vh,560px)] space-y-2 overflow-y-auto">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => selectRow(r)}
                      className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors ${
                        selected?.id === r.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {r.sourceOrder?.orderNumber || r.sourceOrderNumber || '未匹配订单'} |{' '}
                          {r.sku?.code || '未匹配SKU'} | x {r.returnedQty}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.status} · {r.disposition}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        品相: {r.condition} · 问题: {r.issueDescription || '-'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">核对原单 · 处置决策</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                请从左侧选择一条退货记录，将在此展示<strong>原订单明细</strong>并提交<strong>处置决策</strong>。
              </p>
            ) : (
              <>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">当前退货记录</p>
                    <span className="text-xs text-muted-foreground">ID: {selected.id}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    登记备注: {selected.intakeNotes || '-'} · 决策备注(已保存):{' '}
                    {selected.decisionNotes || '-'}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">回看原订单</h3>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/orders">打开订单管理</Link>
                    </Button>
                  </div>
                  {!orderIdForDetail ? (
                    <p className="text-sm text-muted-foreground">
                      本条未关联来源订单。可在上方「登记与匹配」中填写来源订单 ID/单号后新建记录。
                    </p>
                  ) : orderLoading ? (
                    <div className="h-24 animate-pulse rounded bg-muted" />
                  ) : orderDetail ? (
                    <div className="rounded border p-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <span className="font-medium">{orderDetail.orderNumber}</span>
                        <span className="text-muted-foreground">{orderDetail.status}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(orderDetail.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        客户: {orderDetail.customer?.name || '-'}
                      </p>
                      <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                        {(orderDetail.items || []).map((it) => (
                          <li key={`${it.skuId}-${it.quantity}`}>
                            {it.sku?.code || it.skuId} · {it.sku?.product?.name || '-'} ×{' '}
                            {it.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">无法加载该订单详情。</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="mb-3 text-sm font-semibold">处置决策</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>决策</Label>
                      <Select
                        value={decision}
                        onValueChange={(v) => setDecision(v as ReturnDisposition)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISPOSITION_OPTIONS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>决策备注</Label>
                      <Input
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                      />
                    </div>
                    <div>
                      <Button onClick={submitDecision} disabled={saving}>
                        {saving ? '提交中...' : '提交处置决策'}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
