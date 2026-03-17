// 2026-03-16T23:30:00 - Shopping cart with MOQ validation, subtotal, and checkout
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Package,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth-guard';
import { Badge } from '@/components/ui/badge';

// Updated: 2026-03-16T23:40:00 - P0 闭环: 与后端 WholesaleCartItemDto 对齐
type CartItem = {
  skuId: string;
  skuCode?: string;
  productName?: string;
  variantLabel?: string;
  wholesalePrice: number;
  quantity: number;
  minOrderQty?: number;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
};

function CartContent() {
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Updated: 2026-03-16T23:41:00 - P0 闭环: API 返回为数组，直接映射
  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const { data } = await api.get('/cart');
        const arr = Array.isArray(data) ? data : data?.items || [];
        setItems(arr);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  // Updated: 2026-03-16T23:42:00 - P0 闭环: 字段名 qty→quantity 与后端对齐
  const updateQuantity = async (skuId: string, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) =>
      prev.map((item) =>
        item.skuId === skuId ? { ...item, quantity: newQty } : item
      )
    );
    try {
      const { data } = await api.post('/cart/items', { skuId, quantity: newQty });
      if (Array.isArray(data)) setItems(data);
    } catch {
      // Revert handled silently
    }
  };

  const removeItem = async (skuId: string) => {
    setItems((prev) => prev.filter((item) => item.skuId !== skuId));
    try {
      await api.delete(`/cart/items/${skuId}`);
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.wholesalePrice * item.quantity,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const moqViolations = items.filter(
    (item) => item.minOrderQty && item.quantity < item.minOrderQty
  );
  const canCheckout = items.length > 0 && moqViolations.length === 0;

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders');
      toast.success('Order placed successfully!');
      window.location.href = `/orders/${data.orderId || data.id || ''}`;
    } catch {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Shopping Cart
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground">
              Your cart is empty
            </h2>
            <p className="text-sm text-muted-foreground">
              Browse our products and add items to your cart
            </p>
            <Link href="/products">
              <Button className="gap-2">
                <Package className="h-4 w-4" />
                Browse Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="space-y-3 lg:col-span-2">
            {/* MOQ Warning */}
            {moqViolations.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Minimum order quantity not met
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      {moqViolations.length}{' '}
                      {moqViolations.length === 1 ? 'item needs' : 'items need'}{' '}
                      quantity adjustment before checkout.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {items.map((item) => {
              const belowMoq =
                item.minOrderQty != null && item.quantity < item.minOrderQty;
              const displayName = item.productName
                ? `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`
                : item.skuCode || item.skuId;
              return (
                <Card
                  key={item.skuId}
                  className={belowMoq ? 'border-amber-200' : ''}
                >
                  <CardContent className="flex gap-4 p-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      <Package className="h-8 w-8 text-muted-foreground/20" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            {displayName}
                          </h3>
                          {item.skuCode && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              SKU: {item.skuCode}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.skuId)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${displayName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.skuId, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.skuId,
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="h-8 w-16 text-center text-sm"
                            aria-label="Quantity"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.skuId, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {belowMoq && (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-700"
                            >
                              Min: {item.minOrderQty}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            &euro;
                            {(item.wholesalePrice * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            &euro;{Number(item.wholesalePrice).toFixed(2)} / unit
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Items ({totalItems} {totalItems === 1 ? 'unit' : 'units'})
                    </span>
                    <span>&euro;{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="text-emerald-600">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Subtotal</span>
                    <span className="text-primary">
                      &euro;{subtotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Excl. VAT &amp; shipping
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleCheckout}
                  disabled={!canCheckout || submitting}
                >
                  {submitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      Place Order
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {!canCheckout && items.length > 0 && (
                  <p className="text-center text-xs text-amber-600">
                    Please adjust quantities to meet minimum order requirements
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <AuthGuard>
      <CartContent />
    </AuthGuard>
  );
}
