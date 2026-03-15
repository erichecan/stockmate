// Updated: 2026-03-14T19:00:00 - 批发站: 购物车页（调用 /wholesale/cart + /wholesale/orders）
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type CartItem = {
  skuId: string;
  quantity: number;
  wholesalePrice: number;
  minOrderQty: number;
  stockStatus: string;
};

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;
      if (!token) {
        setError('请先登录后再查看购物车。');
        setItems([]);
        return;
      }
      const res = await api.get('/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data || []);
    } catch (e) {
      setError('加载购物车失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const updateQuantity = async (skuId: string, quantity: number) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;
      if (!token) return;
      await api.post(
        '/cart/items',
        { skuId, quantity },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await loadCart();
    } catch (e) {
      setError('更新数量失败，请检查起订量或稍后再试。');
    }
  };

  const removeItem = async (skuId: string) => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;
      if (!token) return;
      await api.delete(`/cart/items/${skuId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadCart();
    } catch {
      setError('删除商品失败，请稍后再试。');
    }
  };

  const total = items.reduce(
    (sum, it) => sum + it.wholesalePrice * it.quantity,
    0,
  );

  // 2026-03-14 23:xx:xx 补全缺失的提交订单逻辑，修复 build 报错 handleSubmitOrder
  const handleSubmitOrder = async () => {
    try {
      setSubmittingOrder(true);
      setSubmitError(null);
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken')
          : null;
      if (!token) {
        setSubmitError('请先登录后再提交订单。');
        return;
      }
      await api.post('/orders', {}, { headers: { Authorization: `Bearer ${token}` } });
      await loadCart();
      window.location.href = '/orders';
    } catch (e) {
      setSubmitError('提交订单失败，请稍后再试。');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="cart-heading">
      <h2 id="cart-heading" className="text-xl font-semibold text-foreground">购物车</h2>
      {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {!loading && !error && (
        <>
          <table className="w-full text-left text-xs border-collapse border border-border rounded-md overflow-hidden">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] text-muted-foreground">
                <th className="py-2 px-2 font-medium">SKU</th>
                <th className="py-2 px-2 font-medium">数量</th>
                <th className="py-2 px-2 font-medium">单价</th>
                <th className="py-2 px-2 font-medium">小计</th>
                <th className="py-2 px-2 font-medium">库存</th>
                <th className="py-2 px-2 font-medium w-12" scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.skuId} className="border-b border-border">
                  <td className="py-2 px-2 font-mono">{it.skuId}</td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      aria-label={`${it.skuId} 数量`}
                      className="w-16 rounded border border-input bg-background px-1 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={it.quantity}
                      min={0}
                      onChange={(e) =>
                        updateQuantity(it.skuId, Number(e.target.value) || 0)
                      }
                    />
                    <div className="text-[10px] text-muted-foreground">
                      起订量：{it.minOrderQty}
                    </div>
                  </td>
                  <td className="py-2 px-2">{it.wholesalePrice.toFixed(2)}</td>
                  <td className="py-2 px-2">
                    {(it.wholesalePrice * it.quantity).toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-[11px]">{it.stockStatus}</td>
                  <td className="py-2 px-2 text-right">
                    <button
                      type="button"
                      className="cursor-pointer text-[11px] text-destructive underline transition-colors hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                      onClick={() => removeItem(it.skuId)}
                      aria-label={`删除 ${it.skuId}`}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-2 text-center text-xs text-muted-foreground"
                  >
                    购物车为空。
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">合计：</span>
            <span className="font-semibold">{total.toFixed(2)}</span>
          </div>

          <div className="mt-4 border-t pt-3 text-sm">
            {submitError && (
              <p className="mb-2 text-xs text-red-600">{submitError}</p>
            )}
            <div className="flex justify-end gap-2">
              <a
                href="/"
                className="cursor-pointer rounded border border-border px-3 py-1 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                继续选购
              </a>
              <button
                type="button"
                className="cursor-pointer rounded bg-primary px-3 py-1 text-xs text-primary-foreground transition-colors duration-200 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={handleSubmitOrder}
                disabled={submittingOrder || items.length === 0}
              >
                {submittingOrder ? '提交中…' : '提交订单'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

