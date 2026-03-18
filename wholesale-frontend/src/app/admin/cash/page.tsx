// Updated: 2026-03-18T23:18:50 - 现金账页面接入开柜/记账/关柜/日总账
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

type TxType = 'IN' | 'OUT';

export default function AdminCashPage() {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('0');
  const [txType, setTxType] = useState<TxType>('IN');
  const [txAmount, setTxAmount] = useState('0');
  const [txDesc, setTxDesc] = useState('');
  const [summary, setSummary] = useState<any>(null);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/cashbook/ledger/daily', {
        params: { date },
      });
      setSummary(data ?? null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [date]);

  const openSession = async () => {
    try {
      const { data } = await authApi.post('/cashbook/sessions/open', {
        openingCash: Number(openingCash || 0),
      });
      setSessionId(data?.id || '');
      toast.success('现金柜已开启');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '开柜失败');
    }
  };

  const createTransaction = async () => {
    try {
      await authApi.post('/cashbook/transactions', {
        type: txType,
        amount: Number(txAmount || 0),
        description: txDesc || undefined,
      });
      toast.success('流水已记录');
      setTxDesc('');
      await loadLedger();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '记账失败');
    }
  };

  const closeSession = async () => {
    if (!sessionId) {
      toast.error('请先填写或保留当前 sessionId');
      return;
    }
    try {
      await authApi.post(`/cashbook/sessions/${sessionId}/close`, {
        closingCash: Number(closingCash || 0),
      });
      toast.success('现金柜已关闭');
      await loadLedger();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '关柜失败');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cash & Finance</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        销售主管现金账：开柜、记账、关柜、查看当日总账。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">班次操作</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Opening Cash</Label>
            <Input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Session ID（用于关柜）</Label>
            <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Closing Cash</Label>
            <Input
              type="number"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={openSession}>
              开柜
            </Button>
            <Button onClick={closeSession}>关柜</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">记流水</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={txType} onValueChange={(v) => setTxType(v as TxType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">IN</SelectItem>
                <SelectItem value="OUT">OUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input
              type="number"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={createTransaction}>记账</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Daily Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-end gap-2">
            <div className="space-y-1">
              <Label>日期</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-48"
              />
            </div>
            <Button variant="outline" onClick={loadLedger}>
              刷新
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
            </div>
          ) : summary ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 rounded border p-3">
                <div>
                  <p className="text-muted-foreground">Total IN</p>
                  <p className="font-semibold">{summary.summary?.totalIn ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total OUT</p>
                  <p className="font-semibold">{summary.summary?.totalOut ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Net</p>
                  <p className="font-semibold">{summary.summary?.net ?? 0}</p>
                </div>
              </div>
              <ul className="space-y-1">
                {(summary.transactions || []).slice(0, 100).map((tx: any) => (
                  <li key={tx.id} className="rounded border px-2 py-1 text-xs">
                    {new Date(tx.createdAt).toLocaleString()} | {tx.type} | {tx.amount} |{' '}
                    {tx.description || '-'}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No ledger data
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
