// Updated: 2026-03-14T19:00:00 - 批发站: 商品详情页 + 加入购物车
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type ProductPageProps = {
  params: { id: string };
};

type SkuItem = {
  id: string;
  code: string;
  wholesalePrice?: number;
  minOrderQty?: number;
  stockStatus?: string;
};

type ProductDetail = {
  id: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  skus?: SkuItem[];
};

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [addingSkuId, setAddingSkuId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const tenantSlug =
          process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
        let token: string | null = null;
        if (typeof window !== 'undefined') {
          token = localStorage.getItem('accessToken');
          setIsAuthed(!!token);
        }

        const endpoint = token ? `/products/${id}` : `/public/products/${id}`;
        const params: Record<string, string> = {};
        if (!token) {
          params.tenantSlug = tenantSlug;
        }

        const res = await api.get(endpoint, {
          params,
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        });

        setData(res.data || null);
      } catch (e) {
        setError('加载商品详情失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddToCart = async (sku: SkuItem) => {
    if (!sku.id) return;
    const qty = sku.minOrderQty && sku.minOrderQty > 0 ? sku.minOrderQty : 1;

    try {
      setAddingSkuId(sku.id);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;
      if (!token) {
        window.alert('请先登录后再加入购物车');
        return;
      }
      await api.post(
        '/cart/items',
        { skuId: sku.id, quantity: qty },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      window.alert('已加入购物车');
    } catch {
      window.alert('加入购物车失败，请检查起订量或稍后重试');
    } finally {
      setAddingSkuId(null);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">商品详情</h2>
      {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && data && (
        <div className="space-y-3 rounded-md border bg-card p-4 text-sm">
          <div>
            <div className="text-base font-medium">{data.name}</div>
            {data.nameEn && (
              <div className="text-xs text-muted-foreground">
                {data.nameEn}
              </div>
            )}
          </div>
          {data.description && (
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {data.description}
            </p>
          )}

          {isAuthed ? (
            <div className="space-y-2">
            <div className="text-sm font-semibold">
                可售 SKU（价格 / 起订量 / 库存状态）
              </div>
              <ul className="space-y-1">
                {(data.skus || []).map((sku) => (
                  <li
                    key={sku.id}
                    className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                  >
                    <div>
                      <div className="font-mono">{sku.code}</div>
                      <div className="text-[11px] text-muted-foreground">
                        价：{sku.wholesalePrice ?? '-'} · 起订：
                        {sku.minOrderQty ?? 1} · 库存：
                        {sku.stockStatus ?? '未知'}
                      </div>
                    </div>
                    <button
                      className="rounded border px-2 py-1 text-[11px] disabled:opacity-40"
                      onClick={() => handleAddToCart(sku)}
                      disabled={addingSkuId === sku.id}
                    >
                      {addingSkuId === sku.id ? '加入中…' : '加入购物车'}
                    </button>
                  </li>
                ))}
                {!data.skus?.length && (
                  <li className="text-xs text-muted-foreground">
                    暂无可售 SKU。
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                当前为未登录视图，仅展示商品基础信息。登录后可查看批发价、起订量和实时库存状态。
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="登录或注册以查看价格">
                <a
                  href="/login"
                  className="inline-flex cursor-pointer items-center justify-center rounded-md border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  登录后查看价格
                </a>
                <a
                  href="/register"
                  className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  注册
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

