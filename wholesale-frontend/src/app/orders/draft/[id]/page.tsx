// 2026-03-17T12:35:12 - DRAFT order edit: read order, PATCH /orders/:id/items, POST /orders/:id/pay
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  CreditCard,
  Loader2,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth-guard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type OrderItem = {
  id: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  unitPrice: number;
};

type DraftOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
};

function DraftOrderContent() {
  const params = useParams();
  const orderId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<DraftOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        setOrder(data);
      } catch {
        setOrder({
          id: orderId,
          orderNumber: `DRAFT-${orderId.slice(0, 8)}`,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          totalAmount: 0,
          currency: 'EUR',
          items: [],
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, orderId]);

  const updateItemQty = async (itemId: string, newQty: number) => {
    if (!order || newQty < 1) return;
    const items = order.items.map((it) =>
      it.id === itemId ? { ...it, quantity: newQty } : it
    );
    setOrder({ ...order, items });
    setSaving(true);
    try {
      await api.patch(`/orders/${orderId}/items`, {
        items: items.map((it) => ({ id: it.id, skuId: it.skuId, quantity: it.quantity })),
      });
      const subtotal = items.reduce((s, it) => s + it.quantity * Number(it.unitPrice), 0);
      setOrder((o) => (o ? { ...o, totalAmount: subtotal, items } : { ...order, totalAmount: subtotal, items }));
    } catch {
      toast.error('Failed to update');
      setOrder(order);
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!order) return;
    const items = order.items.filter((it) => it.id !== itemId);
    setOrder({ ...order, items });
    setSaving(true);
    try {
      await api.patch(`/orders/${orderId}/items`, {
        items: items.map((it) => ({ id: it.id, skuId: it.skuId, quantity: it.quantity })),
      });
      const subtotal = items.reduce((s, it) => s + it.quantity * Number(it.unitPrice), 0);
      setOrder((o) => (o ? { ...o, totalAmount: subtotal, items } : { ...order, totalAmount: subtotal, items }));
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
      setOrder(order);
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    if (!order || order.items.length === 0) {
      toast.error('Add items before paying');
      return;
    }
    setPaying(true);
    try {
      const { data } = await api.post(`/orders/${orderId}/pay`);
      toast.success('Payment initiated');
      window.location.href = `/orders/${data?.orderId || data?.id || orderId}`;
    } catch {
      toast.error('Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-60 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Package className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-semibold">Draft not found</h2>
        <Link href="/orders">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const subtotal = order.items.reduce(
    (s, it) => s + it.quantity * Number(it.unitPrice),
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/orders"
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Draft {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit items and pay when ready
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            {order.items.length === 0 ? (
              <CardContent>
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No items yet. Add from cart or quick reorder.
                </p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.skuName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.skuCode}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateItemQty(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || saving}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQty(
                                item.id,
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="h-8 w-16 text-center text-sm"
                            disabled={saving}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateItemQty(item.id, item.quantity + 1)}
                            disabled={saving}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        &euro;{Number(item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        &euro;{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                          disabled={saving}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">
                  &euro;{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    &euro;{subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handlePay}
            disabled={order.items.length === 0 || paying}
          >
            {paying ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            Pay Now
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DraftOrderPage() {
  return (
    <AuthGuard>
      <DraftOrderContent />
    </AuthGuard>
  );
}
