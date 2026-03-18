'use client';
// Updated: 2026-03-18T23:02:30 - 管理端预售限购配置页（统一值 + 等级值）

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Tier = 'NORMAL' | 'SILVER' | 'GOLD' | 'VIP';
const TIERS: Tier[] = ['NORMAL', 'SILVER', 'GOLD', 'VIP'];

type SkuRow = {
  id: string;
  code: string;
  product?: { name?: string | null; nameEn?: string | null };
};

export default function AdminPreorderLimitsPage() {
  const [loadingSku, setLoadingSku] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');

  const [unifiedLimit, setUnifiedLimit] = useState('');
  const [tierLimits, setTierLimits] = useState<Record<Tier, string>>({
    NORMAL: '',
    SILVER: '',
    GOLD: '',
    VIP: '',
  });

  const selectedSkuInfo = useMemo(
    () => skus.find((s) => s.id === selectedSku),
    [skus, selectedSku],
  );

  const loadSkus = async () => {
    setLoadingSku(true);
    try {
      const { data } = await authApi.get('/skus', {
        params: { page: 1, limit: 200, search: search.trim() || undefined },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setSkus(list);
    } catch {
      toast.error('加载 SKU 列表失败');
      setSkus([]);
    } finally {
      setLoadingSku(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadSkus();
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const loadLimits = async () => {
      if (!selectedSku) return;
      try {
        const { data } = await authApi.get(
          `/wholesale/admin/preorder/limits/${selectedSku}`,
        );
        setUnifiedLimit(
          data?.maxQtyPerOrder != null ? String(data.maxQtyPerOrder) : '',
        );
        const next: Record<Tier, string> = {
          NORMAL: '',
          SILVER: '',
          GOLD: '',
          VIP: '',
        };
        const arr = Array.isArray(data?.tierLimits) ? data.tierLimits : [];
        arr.forEach((item: any) => {
          if (item?.tier && TIERS.includes(item.tier)) {
            next[item.tier as Tier] = String(item.maxQtyPerOrder ?? '');
          }
        });
        setTierLimits(next);
      } catch {
        setUnifiedLimit('');
        setTierLimits({ NORMAL: '', SILVER: '', GOLD: '', VIP: '' });
      }
    };
    loadLimits();
  }, [selectedSku]);

  const save = async () => {
    if (!selectedSku) {
      toast.error('请先选择 SKU');
      return;
    }
    const maxQtyPerOrder =
      unifiedLimit.trim() === '' ? null : Number(unifiedLimit.trim());
    if (maxQtyPerOrder != null && (!Number.isInteger(maxQtyPerOrder) || maxQtyPerOrder < 1)) {
      toast.error('统一限购必须是 >= 1 的整数');
      return;
    }

    const tierPayload = TIERS.filter((tier) => tierLimits[tier].trim() !== '').map(
      (tier) => ({
        tier,
        maxQtyPerOrder: Number(tierLimits[tier]),
      }),
    );

    if (
      tierPayload.some(
        (p) => !Number.isInteger(p.maxQtyPerOrder) || p.maxQtyPerOrder < 1,
      )
    ) {
      toast.error('等级限购必须是 >= 1 的整数');
      return;
    }

    setSaving(true);
    try {
      await authApi.put(`/wholesale/admin/preorder/limits/${selectedSku}`, {
        maxQtyPerOrder,
        tierLimits: tierPayload,
      });
      toast.success('预售限购已保存');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Preorder Limit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        配置统一限购与等级限购（等级值优先覆盖统一值）。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">选择 SKU</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>搜索</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SKU 编码或商品名"
            />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Select value={selectedSku} onValueChange={setSelectedSku}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingSku ? '加载中...' : '请选择 SKU'}
                />
              </SelectTrigger>
              <SelectContent>
                {skus.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} - {s.product?.nameEn || s.product?.name || '-'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            限购配置 {selectedSkuInfo ? `(${selectedSkuInfo.code})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>统一限购（留空表示不设置）</Label>
            <Input
              type="number"
              min={1}
              value={unifiedLimit}
              onChange={(e) => setUnifiedLimit(e.target.value)}
              placeholder="例如 100"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {TIERS.map((tier) => (
              <div key={tier} className="space-y-1 rounded border p-3">
                <Label>{tier} 限购（留空表示走统一值）</Label>
                <Input
                  type="number"
                  min={1}
                  value={tierLimits[tier]}
                  onChange={(e) =>
                    setTierLimits((prev) => ({ ...prev, [tier]: e.target.value }))
                  }
                  placeholder="例如 50"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={!selectedSku || saving}>
              {saving ? '保存中...' : '保存限购配置'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

