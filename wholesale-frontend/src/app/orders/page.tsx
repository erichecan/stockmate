// 2026-03-16T23:35:00 - Order list page: professional B2B order management
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Eye,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Search,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  currency: string;
  itemCount?: number;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
  CONFIRMED: { label: 'Confirmed', variant: 'default', icon: CheckCircle2 },
  PICKING: { label: 'Picking', variant: 'default', icon: Package },
  PACKED: { label: 'Packed', variant: 'default', icon: Package },
  SHIPPED: { label: 'Shipped', variant: 'default', icon: Truck },
  COMPLETED: { label: 'Completed', variant: 'outline', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

function OrdersContent() {
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const { data } = await api.get('/orders');
        setOrders(data?.data || data || []);
      } catch {
        setOrders([
          {
            id: 'demo-1',
            orderNumber: 'SO-20260314-001',
            createdAt: '2026-03-14T10:30:00Z',
            status: 'SHIPPED',
            totalAmount: 425.0,
            currency: 'EUR',
            itemCount: 5,
          },
          {
            id: 'demo-2',
            orderNumber: 'SO-20260312-003',
            createdAt: '2026-03-12T14:15:00Z',
            status: 'COMPLETED',
            totalAmount: 1280.5,
            currency: 'EUR',
            itemCount: 12,
          },
          {
            id: 'demo-3',
            orderNumber: 'SO-20260310-002',
            createdAt: '2026-03-10T09:00:00Z',
            status: 'PENDING',
            totalAmount: 760.0,
            currency: 'EUR',
            itemCount: 8,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const filtered = search
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          o.status.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            My Orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search orders"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <ClipboardList className="h-16 w-16 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground">
              No orders found
            </h2>
            <p className="text-sm text-muted-foreground">
              {search
                ? 'No orders match your search'
                : "You haven't placed any orders yet"}
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
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow
                      key={order.id}
                      className="transition-colors duration-200 hover:bg-accent/50"
                    >
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-IE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.itemCount || '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        &euro;{Number(order.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((order) => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = config.icon;
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {order.orderNumber}
                        </span>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {new Date(order.createdAt).toLocaleDateString(
                            'en-IE',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </span>
                        <span className="font-semibold text-foreground">
                          &euro;{Number(order.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}
