// Updated: 2026-03-20T08:02:38-0400 - 增加「全部订单」列表，避免仅待处理/未支付两栏时看不到已发货等记录
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authApi } from '@/lib/api';

const PAGE_SIZE = 15;

const PENDING_STATUS_IN = 'PENDING,CONFIRMED,PICKING,PACKED';

type OrderItem = {
  skuId: string;
  quantity: number;
  sku?: { code?: string; product?: { name?: string | null } };
};

type SalesOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customer?: { name?: string | null };
  items?: OrderItem[];
};

type PickPreviewItem = {
  binCode?: string;
  skuCode?: string;
  skuName?: string;
  totalQty?: number;
  quantity?: number;
  shortage?: boolean;
};

type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ProcessingDashboard = {
  processedTodayCount: number;
  todayTotalOrdersCount: number;
  yesterdayTotalOrdersCount: number;
  pendingPipelineCount: number;
  unpaidFailedCount: number;
};

type PaymentMethod =
  | 'CASH'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'CREDIT_CARD'
  | 'OTHER';

type CustomerOption = {
  id: string;
  name: string;
  code: string;
  outstandingBalance?: number | null;
};

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

function PaginationBar(props: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { page, totalPages, loading, onPrev, onNext } = props;
  if (totalPages <= 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        第 {page} / {totalPages} 页
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page <= 1}
          onClick={onPrev}
        >
          上一页
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page >= totalPages}
          onClick={onNext}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const { user } = useAuthStore();
  const isOpsReadOnly = user?.role === 'OPERATIONS';

  const [dashLoading, setDashLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ProcessingDashboard | null>(null);

  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingList, setPendingList] = useState<SalesOrder[]>([]);
  const [pendingMeta, setPendingMeta] = useState({ total: 0, totalPages: 1 });

  const [unpaidLoading, setUnpaidLoading] = useState(true);
  const [unpaidPage, setUnpaidPage] = useState(1);
  const [unpaidList, setUnpaidList] = useState<SalesOrder[]>([]);
  const [unpaidMeta, setUnpaidMeta] = useState({ total: 0, totalPages: 1 });

  const [allLoading, setAllLoading] = useState(true);
  const [allPage, setAllPage] = useState(1);
  const [allList, setAllList] = useState<SalesOrder[]>([]);
  const [allMeta, setAllMeta] = useState({ total: 0, totalPages: 1 });

  const [creatingWave, setCreatingWave] = useState(false);
  /** 跨页勾选：用于合并多页订单生成波次 / 打印 */
  const [selectedOrdersById, setSelectedOrdersById] = useState<
    Record<string, SalesOrder>
  >({});
  const [pickPreview, setPickPreview] = useState<PickPreviewItem[]>([]);
  const [waveId, setWaveId] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [paymentCustomerId, setPaymentCustomerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const { data } = await authApi.get('/sales-orders/processing-dashboard');
      setDashboard({
        processedTodayCount: Number(data?.processedTodayCount) || 0,
        todayTotalOrdersCount: Number(data?.todayTotalOrdersCount) || 0,
        yesterdayTotalOrdersCount: Number(data?.yesterdayTotalOrdersCount) || 0,
        pendingPipelineCount: Number(data?.pendingPipelineCount) || 0,
        unpaidFailedCount: Number(data?.unpaidFailedCount) || 0,
      });
    } catch {
      setDashboard(null);
      toast.error('加载订单看板指标失败');
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadPendingPage = useCallback(async (page: number) => {
    setPendingLoading(true);
    try {
      const { data } = await authApi.get('/sales-orders', {
        params: {
          page,
          limit: PAGE_SIZE,
          statusIn: PENDING_STATUS_IN,
        },
      });
      const body = data as Paginated<SalesOrder>;
      setPendingList(Array.isArray(body?.data) ? body.data : []);
      setPendingMeta({
        total: Number(body?.total) || 0,
        totalPages: Math.max(1, Number(body?.totalPages) || 1),
      });
      setPendingPage(Number(body?.page) || page);
    } catch {
      setPendingList([]);
      setPendingMeta({ total: 0, totalPages: 1 });
      toast.error('加载待处理订单失败');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadUnpaidPage = useCallback(async (page: number) => {
    setUnpaidLoading(true);
    try {
      const { data } = await authApi.get('/sales-orders', {
        params: {
          page,
          limit: PAGE_SIZE,
          unpaidIssue: true,
        },
      });
      const body = data as Paginated<SalesOrder>;
      setUnpaidList(Array.isArray(body?.data) ? body.data : []);
      setUnpaidMeta({
        total: Number(body?.total) || 0,
        totalPages: Math.max(1, Number(body?.totalPages) || 1),
      });
      setUnpaidPage(Number(body?.page) || page);
    } catch {
      setUnpaidList([]);
      setUnpaidMeta({ total: 0, totalPages: 1 });
      toast.error('加载未支付成功订单失败');
    } finally {
      setUnpaidLoading(false);
    }
  }, []);

  const loadAllOrdersPage = useCallback(async (page: number) => {
    setAllLoading(true);
    try {
      const { data } = await authApi.get('/sales-orders', {
        params: { page, limit: PAGE_SIZE },
      });
      const body = data as Paginated<SalesOrder>;
      setAllList(Array.isArray(body?.data) ? body.data : []);
      setAllMeta({
        total: Number(body?.total) || 0,
        totalPages: Math.max(1, Number(body?.totalPages) || 1),
      });
      setAllPage(Number(body?.page) || page);
    } catch {
      setAllList([]);
      setAllMeta({ total: 0, totalPages: 1 });
      toast.error('加载全部订单失败');
    } finally {
      setAllLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadDashboard(),
      loadPendingPage(pendingPage),
      loadUnpaidPage(unpaidPage),
      loadAllOrdersPage(allPage),
    ]);
  }, [
    loadDashboard,
    loadPendingPage,
    loadUnpaidPage,
    loadAllOrdersPage,
    pendingPage,
    unpaidPage,
    allPage,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadPendingPage(1);
    void loadUnpaidPage(1);
    void loadAllOrdersPage(1);
  }, [loadPendingPage, loadUnpaidPage, loadAllOrdersPage]);

  useEffect(() => {
    if (user?.role && user.role !== 'OPERATIONS') {
      void loadCustomers();
    }
  }, [user?.role]);

  const loadCustomers = async () => {
    try {
      const { data } = await authApi.get('/customers', {
        params: { page: 1, limit: 200 },
      });
      setCustomers(data?.data || []);
    } catch {
      setCustomers([]);
    }
  };

  const selectedOrdersForActions = Object.values(selectedOrdersById).filter(
    Boolean,
  );

  const togglePendingSelect = (order: SalesOrder, checked: boolean) => {
    setSelectedOrdersById((prev) => {
      const next = { ...prev };
      if (checked) next[order.id] = order;
      else delete next[order.id];
      return next;
    });
  };

  const printOrders = () => {
    if (!selectedOrdersForActions.length) {
      toast.error('请在「待处理订单」中勾选订单');
      return;
    }
    const html = `
      <html>
      <head><title>Order Print</title></head>
      <body>
        <h2>Orders (${new Date().toLocaleString()})</h2>
        ${selectedOrdersForActions.map(
          (o) => `
            <section style="margin-bottom:16px;border:1px solid #ddd;padding:8px;">
              <h3>${o.orderNumber}</h3>
              <p>Status: ${o.status} | Customer: ${o.customer?.name || '-'}</p>
              <ul>
                ${(o.items || [])
                  .map(
                    (it) =>
                      `<li>${it.sku?.code || it.skuId} - ${it.sku?.product?.name || ''} x ${it.quantity}</li>`,
                  )
                  .join('')}
              </ul>
            </section>
          `,
        ).join('')}
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const generateWavePickList = async () => {
    if (!selectedOrdersForActions.length) {
      toast.error('请在「待处理订单」中勾选订单');
      return;
    }
    setCreatingWave(true);
    try {
      const createRes = await authApi.post('/wms/waves', {
        orderIds: selectedOrdersForActions.map((o) => o.id),
      });
      const createdWaveId = createRes.data?.id as string | undefined;
      if (!createdWaveId) {
        throw new Error('WMS wave id missing');
      }
      setWaveId(createdWaveId);

      const pickRes = await authApi.get(`/wms/waves/${createdWaveId}/pick-list`);
      const items = Array.isArray(pickRes.data?.items) ? pickRes.data.items : [];
      setPickPreview(items as PickPreviewItem[]);
      setSelectedOrdersById({});
      toast.success(
        `已创建正式波次 ${createRes.data?.waveNumber || ''}，并生成拣货单`,
      );
      await refreshAll();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '生成正式波次失败'));
    } finally {
      setCreatingWave(false);
    }
  };

  const printPickList = () => {
    if (!pickPreview.length) {
      toast.error('请先生成拣货单');
      return;
    }
    const html = `
      <html>
      <head><title>Wave Pick List</title></head>
      <body>
        <h2>Wave Pick List (${new Date().toLocaleString()})</h2>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Bin</th><th>SKU</th><th>Name</th><th>Qty</th></tr></thead>
          <tbody>
            ${pickPreview
              .map(
                (it) =>
                  `<tr><td>${it.binCode || '-'}</td><td>${it.skuCode || '-'}</td><td>${it.skuName || '-'}</td><td>${it.shortage ? '缺货' : (it.totalQty ?? it.quantity ?? 0)}</td></tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const createPayment = async () => {
    if (!paymentCustomerId) {
      toast.error('请选择零售商');
      return;
    }
    try {
      const { data } = await authApi.post('/payments', {
        customerId: paymentCustomerId,
        amount: Number(paymentAmount || 0),
        method: paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
      toast.success(
        `收款登记成功，客户剩余未结：${data?.customer?.outstandingAfter ?? '--'}`,
      );
      setPaymentAmount('0');
      setPaymentReference('');
      setPaymentNotes('');
      await loadCustomers();
      await refreshAll();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, '收款登记失败'));
    }
  };

  const d = dashboard;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">订单管理</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isOpsReadOnly
          ? '运营角色：本页可浏览订单指标与列表；订单推进与收款登记请由订单处理角色在「订单管理」完成。'
          : '待处理/未支付两栏为筛选视图；已发货、已完成等请查看下方「全部订单」。勾选生成波次请在「待处理订单」中进行。'}
      </p>

      <div className="mt-4 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">订单处理概览</p>
        <p className="mt-1 text-xs text-muted-foreground">
          指标按 UTC 自然日统计；「未支付成功」含 DRAFT 及关联账单未结（UNPAID /
          PARTIALLY_PAID / OVERDUE）。
        </p>
        {dashLoading || !d ? (
          <div className="mt-3 h-16 animate-pulse rounded bg-muted" />
        ) : (
          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {d.processedTodayCount}
              </p>
              <p className="text-sm text-muted-foreground">今日已处理订单</p>
              <p className="text-xs text-muted-foreground">
                今日内更新且状态为确认后履约链路
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {d.todayTotalOrdersCount}
              </p>
              <p className="text-sm text-muted-foreground">今日总订单（截至现在）</p>
              <p className="text-xs text-muted-foreground">
                昨日总订单：{d.yesterdayTotalOrdersCount}
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {d.pendingPipelineCount}
              </p>
              <p className="text-sm text-muted-foreground">待处理订单</p>
              <p className="text-xs text-muted-foreground">
                PENDING / CONFIRMED / PICKING / PACKED
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {d.unpaidFailedCount}
              </p>
              <p className="text-sm text-muted-foreground">未支付成功订单</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={() => void refreshAll()}>
          刷新列表与指标
        </Button>
      </div>

      {isOpsReadOnly && (
        <Card className="mt-4 border-amber-200 bg-amber-50/80 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm text-amber-900 dark:text-amber-100">
            订单推进（打印、生成波次、拣货单）与收款登记属于<strong>订单处理角色</strong>。
            运营请关注<strong>经营总览</strong>与<strong>员工管理</strong>。
          </CardContent>
        </Card>
      )}

      {!isOpsReadOnly && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={printOrders}>
              打印订单
            </Button>
            <Button onClick={generateWavePickList} disabled={creatingWave}>
              {creatingWave ? '创建中...' : '生成拣货单（波次）'}
            </Button>
            <Button variant="outline" onClick={printPickList}>
              打印拣货单
            </Button>
            {waveId && (
              <Link
                href={`/admin/warehouse-waves?waveId=${encodeURIComponent(waveId)}`}
              >
                <Button variant="outline">查看拣货看板</Button>
              </Link>
            )}
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">收款登记</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div className="space-y-1 md:col-span-2">
                <Label>零售商</Label>
                <Select value={paymentCustomerId} onValueChange={setPaymentCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择零售商" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code}) 未结 {Number(c.outstandingBalance || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>金额</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>方式</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="DEBIT_CARD">DEBIT_CARD</SelectItem>
                    <SelectItem value="CREDIT_CARD">CREDIT_CARD</SelectItem>
                    <SelectItem value="BANK_TRANSFER">BANK_TRANSFER</SelectItem>
                    <SelectItem value="CHECK">CHECK</SelectItem>
                    <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reference</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>备注</Label>
                <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={createPayment}>登记收款</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              待处理订单列表
              {!isOpsReadOnly && selectedOrdersForActions.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  已选 {selectedOrdersForActions.length} 单（可跨页勾选）
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : pendingList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无待处理订单（仅 PENDING/CONFIRMED/PICKING/PACKED）。
                <br />
                若订单已发货/完成，请查看下方「全部订单」。
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingList.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      {!isOpsReadOnly && (
                        <Checkbox
                          checked={!!selectedOrdersById[o.id]}
                          onCheckedChange={(v) => togglePendingSelect(o, !!v)}
                        />
                      )}
                      <div>
                        <div className="font-medium">{o.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleString()} ·{' '}
                          {o.customer?.name || '-'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">{o.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <PaginationBar
              page={pendingPage}
              totalPages={pendingMeta.totalPages}
              loading={pendingLoading}
              onPrev={() => void loadPendingPage(Math.max(1, pendingPage - 1))}
              onNext={() =>
                void loadPendingPage(
                  Math.min(pendingMeta.totalPages, pendingPage + 1),
                )
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">未支付成功订单列表</CardTitle>
          </CardHeader>
          <CardContent>
            {unpaidLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : unpaidList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无未支付成功订单
              </p>
            ) : (
              <ul className="space-y-2">
                {unpaidList.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{o.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString()} ·{' '}
                        {o.customer?.name || '-'}
                      </div>
                    </div>
                    <Badge variant={o.status === 'DRAFT' ? 'destructive' : 'outline'}>
                      {o.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <PaginationBar
              page={unpaidPage}
              totalPages={unpaidMeta.totalPages}
              loading={unpaidLoading}
              onPrev={() => void loadUnpaidPage(Math.max(1, unpaidPage - 1))}
              onNext={() =>
                void loadUnpaidPage(Math.min(unpaidMeta.totalPages, unpaidPage + 1))
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">全部订单</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            不按状态过滤，含已发货/已完成/取消等；与「待处理」「未支付」两栏互补。当前共{' '}
            {allMeta.total} 条。
          </p>
          {allLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : allList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">暂无订单数据</p>
          ) : (
            <ul className="space-y-2">
              {allList.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div>
                    <div className="font-medium">{o.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()} · {o.customer?.name || '-'}
                    </div>
                  </div>
                  <Badge variant="outline">{o.status}</Badge>
                </li>
              ))}
            </ul>
          )}
          <PaginationBar
            page={allPage}
            totalPages={allMeta.totalPages}
            loading={allLoading}
            onPrev={() => void loadAllOrdersPage(Math.max(1, allPage - 1))}
            onNext={() =>
              void loadAllOrdersPage(Math.min(allMeta.totalPages, allPage + 1))
            }
          />
        </CardContent>
      </Card>

      {!isOpsReadOnly && pickPreview.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              拣货单预览 {waveId ? `(Wave: ${waveId.slice(0, 8)})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {pickPreview.slice(0, 100).map((it, idx) => (
                <li key={`${it.skuCode}-${idx}`} className="rounded border px-2 py-1">
                  {it.binCode || '-'} | {it.skuCode || '-'} | {it.skuName || '-'} x{' '}
                  {it.shortage ? '缺货' : (it.totalQty ?? it.quantity ?? 0)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
