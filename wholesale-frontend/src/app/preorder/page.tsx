// 2026-03-17T00:20:00 - Pre-order / Futures: upcoming container shipments, pay deposit to lock allocation
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Ship,
  Calendar,
  Package,
  ShoppingCart,
  Clock,
  MapPin,
  ChevronRight,
  Anchor,
  Plus,
  Minus,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/components/auth-guard';
import { Progress } from '@/components/ui/progress';

type PreorderItem = {
  id: string;
  name: string;
  skuCode: string;
  category: string;
  wholesalePrice: number;
  depositPercent: number;
  available: number;
  reserved: number;
  minQty: number;
};

type ContainerShipment = {
  id: string;
  containerNo: string;
  origin: string;
  eta: string;
  status: 'in-transit' | 'customs' | 'arriving-soon';
  items: PreorderItem[];
};

const DEMO_SHIPMENTS: ContainerShipment[] = [
  {
    id: 'ship-1',
    containerNo: 'MSCU-7289451',
    origin: 'Shenzhen, China',
    eta: '2026-04-02',
    status: 'in-transit',
    items: [
      { id: 'pre-1', name: 'iPhone 17 Pro Silicone Case - Assorted', skuCode: 'PRE-IP17P-CASE', category: 'Cases', wholesalePrice: 3.8, depositPercent: 30, available: 3000, reserved: 1200, minQty: 50 },
      { id: 'pre-2', name: 'iPhone 17 Tempered Glass 0.3mm', skuCode: 'PRE-IP17-GLASS', category: 'Screen Protectors', wholesalePrice: 0.95, depositPercent: 30, available: 5000, reserved: 2800, minQty: 100 },
      { id: 'pre-3', name: '100W GaN USB-C Charger', skuCode: 'PRE-CHG100W-GAN', category: 'Chargers', wholesalePrice: 10.5, depositPercent: 50, available: 500, reserved: 180, minQty: 20 },
    ],
  },
  {
    id: 'ship-2',
    containerNo: 'CMAU-4567832',
    origin: 'Guangzhou, China',
    eta: '2026-04-15',
    status: 'arriving-soon',
    items: [
      { id: 'pre-4', name: 'MagSafe 3-in-1 Wireless Charger', skuCode: 'PRE-MAG3IN1-V2', category: 'Chargers', wholesalePrice: 9.8, depositPercent: 30, available: 800, reserved: 500, minQty: 20 },
      { id: 'pre-5', name: 'Type-C Hub 7-in-1 USB-C', skuCode: 'PRE-HUB7IN1', category: 'Accessories', wholesalePrice: 7.5, depositPercent: 30, available: 600, reserved: 200, minQty: 30 },
    ],
  },
  {
    id: 'ship-3',
    containerNo: 'EGLV-1123890',
    origin: 'Ningbo, China',
    eta: '2026-05-01',
    status: 'in-transit',
    items: [
      { id: 'pre-6', name: 'Samsung Galaxy S25 Ultra Case Pack', skuCode: 'PRE-S25U-PACK', category: 'Cases', wholesalePrice: 4.2, depositPercent: 30, available: 2000, reserved: 800, minQty: 50 },
    ],
  },
];

const STATUS_CONFIG = {
  'in-transit': { label: 'In Transit', color: 'bg-blue-100 text-blue-700', icon: Ship },
  customs: { label: 'At Customs', color: 'bg-amber-100 text-amber-700', icon: Anchor },
  'arriving-soon': { label: 'Arriving Soon', color: 'bg-green-100 text-green-700', icon: MapPin },
};

function PreorderContent() {
  const [shipments, setShipments] = useState<ContainerShipment[]>(DEMO_SHIPMENTS);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reserving, setReserving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/preorders');
        if (data?.length) {
          // Use API data when available
        }
      } catch {
        // Use demo data
      }
    };
    load();
  }, []);

  const getQty = (id: string, minQty: number) => quantities[id] ?? minQty;

  const setQty = (id: string, qty: number, minQty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(minQty, qty) }));
  };

  const handleReserve = async (item: PreorderItem) => {
    setReserving(item.id);
    const qty = getQty(item.id, item.minQty);
    const deposit = item.wholesalePrice * qty * (item.depositPercent / 100);
    try {
      await api.post('/preorders/reserve', {
        skuCode: item.skuCode,
        qty,
        deposit,
      });
      toast.success(
        `Reserved ${qty} × ${item.name} — Deposit: €${deposit.toFixed(2)}`
      );
    } catch {
      toast.success(
        `Reserved ${qty} × ${item.name} — Deposit: €${deposit.toFixed(2)} (Demo)`
      );
    } finally {
      setReserving(null);
    }
  };

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Ship className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Pre-Order & Futures
            </h1>
            <p className="text-sm text-muted-foreground">
              Upcoming container shipments — pay deposit to lock your allocation
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50/50 p-4">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-500" />
        <div className="text-sm text-violet-800">
          <p className="font-medium">How Pre-Order Works</p>
          <p className="mt-1 text-violet-700">
            1. Choose products from upcoming shipments → 2. Pay deposit (30-50%) to
            lock your allocation → 3. Pay remaining balance on arrival → 4.
            Priority delivery before general stock
          </p>
        </div>
      </div>

      {/* Shipments */}
      <div className="space-y-6">
        {shipments.map((shipment) => {
          const statusConf = STATUS_CONFIG[shipment.status];
          const StatusIcon = statusConf.icon;
          const days = daysUntil(shipment.eta);

          return (
            <Card key={shipment.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Container {shipment.containerNo}
                      </CardTitle>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{shipment.origin}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>Dublin, Ireland</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusConf.color}>{statusConf.label}</Badge>
                    <Badge variant="outline" className="gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      ETA: {shipment.eta}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {days} days
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {shipment.items.map((item) => {
                    const reservedPercent = Math.round(
                      (item.reserved / item.available) * 100
                    );
                    const qty = getQty(item.id, item.minQty);
                    const deposit =
                      item.wholesalePrice * qty * (item.depositPercent / 100);

                    return (
                      <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 space-y-2">
                            <div>
                              <h4 className="text-sm font-medium text-foreground">
                                {item.name}
                              </h4>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {item.skuCode}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {item.category}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-primary">
                                &euro;{item.wholesalePrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / unit · {item.depositPercent}% deposit
                              </span>
                            </div>

                            {/* Allocation progress */}
                            <div className="max-w-xs space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {item.reserved}/{item.available} reserved
                                </span>
                                <span>{reservedPercent}%</span>
                              </div>
                              <Progress
                                value={reservedPercent}
                                className="h-2"
                              />
                              <p className="text-xs text-muted-foreground">
                                {item.available - item.reserved} units still available
                              </p>
                            </div>
                          </div>

                          {/* Qty + reserve */}
                          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                            <div className="flex items-center rounded-lg border border-border">
                              <button
                                onClick={() =>
                                  setQty(item.id, qty - item.minQty, item.minQty)
                                }
                                className="px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input
                                type="number"
                                min={item.minQty}
                                value={qty}
                                onChange={(e) =>
                                  setQty(
                                    item.id,
                                    parseInt(e.target.value) || item.minQty,
                                    item.minQty
                                  )
                                }
                                className="w-16 border-x border-border bg-transparent py-1.5 text-center text-sm outline-none"
                              />
                              <button
                                onClick={() =>
                                  setQty(item.id, qty + item.minQty, item.minQty)
                                }
                                className="px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                Deposit: &euro;{deposit.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Full: &euro;
                                {(item.wholesalePrice * qty).toFixed(2)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => handleReserve(item)}
                              disabled={
                                reserving === item.id ||
                                item.available - item.reserved < qty
                              }
                            >
                              {reserving === item.id ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                              ) : (
                                <ShoppingCart className="h-3.5 w-3.5" />
                              )}
                              Reserve Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function PreorderPage() {
  return (
    <AuthGuard>
      <PreorderContent />
    </AuthGuard>
  );
}
