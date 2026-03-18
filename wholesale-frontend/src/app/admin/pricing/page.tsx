'use client';
// Updated: 2026-03-18T22:58:20 - 管理端折扣配置页（等级折扣维护）

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Tier = 'NORMAL' | 'SILVER' | 'GOLD' | 'VIP';

type TierPolicy = {
  tier: Tier;
  discountPercent: number;
  isActive?: boolean;
};

const TIER_ORDER: Tier[] = ['NORMAL', 'SILVER', 'GOLD', 'VIP'];

const DEFAULT_POLICIES: TierPolicy[] = [
  { tier: 'NORMAL', discountPercent: 0, isActive: true },
  { tier: 'SILVER', discountPercent: 2, isActive: true },
  { tier: 'GOLD', discountPercent: 5, isActive: true },
  { tier: 'VIP', discountPercent: 10, isActive: true },
];

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<TierPolicy[]>(DEFAULT_POLICIES);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await authApi.get('/pricing/tier-discounts');
        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) {
          setPolicies(DEFAULT_POLICIES);
          return;
        }
        const merged = TIER_ORDER.map((tier) => {
          const hit = rows.find((r: any) => r.tier === tier);
          return {
            tier,
            discountPercent: hit ? Number(hit.discountPercent) : 0,
            isActive: hit ? !!hit.isActive : true,
          };
        });
        setPolicies(merged);
      } catch {
        toast.error('加载折扣配置失败，已使用默认值');
        setPolicies(DEFAULT_POLICIES);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const preview = useMemo(
    () =>
      policies.map((p) => ({
        ...p,
        factor: ((100 - p.discountPercent) / 100).toFixed(2),
      })),
    [policies],
  );

  const updatePercent = (tier: Tier, value: string) => {
    const next = Math.max(0, Math.min(100, Number(value || 0)));
    setPolicies((prev) =>
      prev.map((p) => (p.tier === tier ? { ...p, discountPercent: next } : p)),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        policies: policies.map((p) => ({
          tier: p.tier,
          discountPercent: Number(p.discountPercent),
          isActive: p.isActive ?? true,
        })),
      };
      await authApi.put('/pricing/tier-discounts', payload);
      toast.success('折扣策略已保存');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tier Discount</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        配置等级折扣（0% 表示原价，2% 表示 2% off）。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">折扣配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            policies.map((p) => (
              <div
                key={p.tier}
                className="grid grid-cols-1 items-center gap-3 rounded border p-3 md:grid-cols-4"
              >
                <div className="font-medium">{p.tier}</div>
                <div className="space-y-1">
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={p.discountPercent}
                    onChange={(e) => updatePercent(p.tier, e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Badge variant="outline">
                    价格系数 {(100 - Number(p.discountPercent)).toFixed(2)}%
                  </Badge>
                </div>
              </div>
            ))
          )}

          <div className="rounded border bg-muted/40 p-3 text-sm">
            <p className="font-medium">预览</p>
            <div className="mt-2 grid gap-1">
              {preview.map((p) => (
                <span key={p.tier} className="text-muted-foreground">
                  {p.tier}: finalPrice = wholesalePrice × {p.factor}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || loading}>
              {saving ? '保存中...' : '保存折扣策略'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

