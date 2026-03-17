// 2026-03-17T00:05:00 - Quick Reorder: one-click repeat last purchase, adjust qty, instant checkout
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Package,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/components/auth-guard';
import { Checkbox } from '@/components/ui/checkbox';

type ReorderItem = {
  skuId: string;
  skuCode: string;
  name: string;
  wholesalePrice: number;
  lastQty: number;
  newQty: number;
  selected: boolean;
  inStock: boolean;
};

function QuickReorderContent() {
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const { data } = await api.get('/orders', { params: { limit: 1 } });
        const lastOrder = data?.data?.[0] || data?.[0];
        if (lastOrder?.items) {
          setItems(
            lastOrder.items.map((item: { skuId: string; skuCode?: string; skuName?: string; quantity: number; unitPrice: number }) => ({
              skuId: item.skuId,
              skuCode: item.skuCode || '',
              name: item.skuName || '',
              wholesalePrice: Number(item.unitPrice),
              lastQty: item.quantity,
              newQty: item.quantity,
              selected: true,
              inStock: true,
            }))
          );
        }
      } catch {
        // Demo data
        setItems([
          { skuId: '1', skuCode: 'CASE-IP16P-BLK', name: 'iPhone 16 Pro Silicone Case - Black', wholesalePrice: 3.5, lastQty: 50, newQty: 50, selected: true, inStock: true },
          { skuId: '2', skuCode: 'CASE-IP16P-CLR', name: 'iPhone 16 Pro Crystal Clear Case', wholesalePrice: 2.8, lastQty: 100, newQty: 100, selected: true, inStock: true },
          { skuId: '3', skuCode: 'CABLE-TC-1M', name: 'Type-C Fast Charging Cable 1m', wholesalePrice: 1.2, lastQty: 200, newQty: 200, selected: true, inStock: true },
          { skuId: '4', skuCode: 'GLASS-IP16PM', name: 'Tempered Glass iPhone 16 Pro Max', wholesalePrice: 0.85, lastQty: 300, newQty: 300, selected: true, inStock: true },
          { skuId: '5', skuCode: 'CHG-20W-USB', name: '20W USB-C PD Charger', wholesalePrice: 4.5, lastQty: 50, newQty: 50, selected: true, inStock: true },
          { skuId: '6', skuCode: 'CABLE-LTN-1M', name: 'Lightning Cable 1m MFi Certified', wholesalePrice: 2.0, lastQty: 100, newQty: 100, selected: false, inStock: false },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const toggleSelect = (skuId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.skuId === skuId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAll = (checked: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.inStock ? { ...item, selected: checked } : item))
    );
  };

  const updateQty = (skuId: string, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((item) =>
        item.skuId === skuId ? { ...item, newQty: qty } : item
      )
    );
  };

  const removeItem = (skuId: string) => {
    setItems((prev) => prev.filter((item) => item.skuId !== skuId));
  };

  const selectedItems = items.filter((i) => i.selected && i.inStock);
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.wholesalePrice * item.newQty,
    0
  );
  const totalUnits = selectedItems.reduce((sum, item) => sum + item.newQty, 0);
  const allSelected = items.filter((i) => i.inStock).every((i) => i.selected);

  const handleAddAllToCart = async () => {
    if (selectedItems.length === 0) return;
    setSubmitting(true);
    try {
      for (const item of selectedItems) {
        await api.post('/cart/items', { skuId: item.skuId, qty: item.newQty });
      }
      toast.success(`${selectedItems.length} items added to cart`);
      window.location.href = '/cart';
    } catch {
      toast.error('Failed to add items to cart');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-8 sm:px-6 lg:px-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="mb-3 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Quick Reorder
            </h1>
            <p className="text-sm text-muted-foreground">
              Your last order items — adjust quantities and reorder instantly
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Package className="h-16 w-16 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground">
              No previous orders found
            </h2>
            <p className="text-sm text-muted-foreground">
              Place your first order to enable quick reordering
            </p>
            <Link href="/products">
              <Button className="gap-2">Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items list */}
          <div className="space-y-2 lg:col-span-2">
            {/* Select all */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => toggleAll(!!checked)}
                aria-label="Select all items"
              />
              <span className="text-sm font-medium text-foreground">
                Select All ({items.filter((i) => i.inStock).length} available)
              </span>
            </div>

            {items.map((item) => (
              <Card
                key={item.skuId}
                className={!item.inStock ? 'opacity-60' : ''}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={() => toggleSelect(item.skuId)}
                    disabled={!item.inStock}
                    aria-label={`Select ${item.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.skuCode} · Last ordered: {item.lastQty} units
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.skuId)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.inStock ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQty(item.skuId, item.newQty - 10)}
                              disabled={item.newQty <= 10}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={item.newQty}
                              onChange={(e) =>
                                updateQty(
                                  item.skuId,
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              className="h-8 w-20 text-center text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQty(item.skuId, item.newQty + 10)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-amber-600 bg-amber-50">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          &euro;{(item.wholesalePrice * item.newQty).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          &euro;{item.wholesalePrice.toFixed(2)} / unit
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reorder Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{selectedItems.length} items selected</span>
                    <span>{totalUnits} units</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>&euro;{subtotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="text-primary">
                      &euro;{subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleAddAllToCart}
                  disabled={selectedItems.length === 0 || submitting}
                >
                  {submitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      Add to Cart & Checkout
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {selectedItems.length === 0
                    ? 'Select items to proceed'
                    : `${selectedItems.length} items · ${totalUnits} units`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuickReorderPage() {
  return (
    <AuthGuard>
      <QuickReorderContent />
    </AuthGuard>
  );
}
