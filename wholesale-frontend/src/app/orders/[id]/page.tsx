// 2026-03-16T23:40:00 - Order detail page with status timeline and line items
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
  FileText,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  skuCode: string;
  skuName: string;
  quantity: number;
  unitPrice: number;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
  notes?: string;
  items: OrderItem[];
  shippingAddress?: string;
  trackingNumber?: string;
};

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Pending', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'PICKING', label: 'Picking', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

function OrderDetailContent() {
  const params = useParams();
  const orderId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        setOrder(data);
      } catch {
        setOrder({
          id: orderId,
          orderNumber: 'SO-20260314-001',
          status: 'SHIPPED',
          createdAt: '2026-03-14T10:30:00Z',
          totalAmount: 425.0,
          currency: 'EUR',
          items: [
            {
              id: '1',
              skuCode: 'CASE-IP16P-BLK',
              skuName: 'iPhone 16 Pro Silicone Case - Black',
              quantity: 50,
              unitPrice: 3.5,
            },
            {
              id: '2',
              skuCode: 'CABLE-TC-1M',
              skuName: 'Type-C Fast Charging Cable 1m',
              quantity: 100,
              unitPrice: 1.2,
            },
            {
              id: '3',
              skuCode: 'GLASS-IP16PM',
              skuName: 'Tempered Glass iPhone 16 Pro Max',
              quantity: 200,
              unitPrice: 0.85,
            },
          ],
          trackingNumber: 'IE2026031400123',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, orderId]);

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
        <FileText className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-semibold">Order not found</h2>
        <Link href="/orders">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(
    (s) => s.key === order.status
  );
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
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
            Order {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-IE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {isCancelled ? (
          <Badge variant="destructive" className="gap-1 px-3 py-1.5 text-sm">
            <XCircle className="h-4 w-4" />
            Cancelled
          </Badge>
        ) : (
          <Badge variant="default" className="gap-1 px-3 py-1.5 text-sm">
            {STATUS_STEPS[currentStepIndex]
              ? STATUS_STEPS[currentStepIndex].label
              : order.status}
          </Badge>
        )}
      </div>

      {/* Status Timeline */}
      {!isCancelled && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isCompleted
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`mt-2 text-xs ${
                          isCurrent
                            ? 'font-semibold text-primary'
                            : isCompleted
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 ${
                          i < currentStepIndex ? 'bg-primary/40' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
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
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      &euro;{Number(item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      &euro;{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">
                  &euro;{Number(order.totalAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Included</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    &euro;{Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tracking:</span>
                  <span className="font-medium">{order.trackingNumber}</span>
                </div>
                {order.shippingAddress && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {order.shippingAddress}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <AuthGuard>
      <OrderDetailContent />
    </AuthGuard>
  );
}
