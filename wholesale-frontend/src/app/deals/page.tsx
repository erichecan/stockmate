// 2026-03-17T00:15:00 - Special Deals & Clearance: high-margin and urgent destocking products
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Flame,
  Clock,
  Tag,
  ShoppingCart,
  Plus,
  Minus,
  Package,
  Percent,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/components/auth-guard';

type DealProduct = {
  id: string;
  name: string;
  skuCode: string;
  image: string;
  originalPrice: number;
  dealPrice: number;
  discount: number;
  stock: number;
  minQty: number;
  category: string;
  tag: 'clearance' | 'hot-deal' | 'flash-sale';
  endsAt?: string;
};

const TABS = [
  { key: 'all', label: 'All Deals', icon: Tag },
  { key: 'flash-sale', label: 'Flash Sale', icon: Zap },
  { key: 'hot-deal', label: 'Hot Deals', icon: Flame },
  { key: 'clearance', label: 'Clearance', icon: Percent },
] as const;

const DEMO_DEALS: DealProduct[] = [
  {
    id: '1', name: 'iPhone 16 Pro Max Clear Case - Bulk', skuCode: 'DEAL-IP16PM-CLR',
    image: '/placeholder-product.jpg', originalPrice: 3.2, dealPrice: 1.8, discount: 44,
    stock: 2000, minQty: 100, category: 'Cases', tag: 'flash-sale',
    endsAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
  },
  {
    id: '2', name: '20W USB-C Charger White - Overstock', skuCode: 'DEAL-CHG20W-WHT',
    image: '/placeholder-product.jpg', originalPrice: 4.5, dealPrice: 2.9, discount: 36,
    stock: 800, minQty: 50, category: 'Chargers', tag: 'clearance',
  },
  {
    id: '3', name: 'Tempered Glass Mixed Pack (iPhone 15/16)', skuCode: 'DEAL-GLASS-MIX',
    image: '/placeholder-product.jpg', originalPrice: 0.9, dealPrice: 0.45, discount: 50,
    stock: 5000, minQty: 200, category: 'Screen Protectors', tag: 'hot-deal',
  },
  {
    id: '4', name: 'Lightning to USB-C Adapter', skuCode: 'DEAL-ADPT-LC',
    image: '/placeholder-product.jpg', originalPrice: 1.5, dealPrice: 0.7, discount: 53,
    stock: 1500, minQty: 100, category: 'Adapters', tag: 'clearance',
  },
  {
    id: '5', name: 'Samsung S24 Ultra Leather Case', skuCode: 'DEAL-S24U-LTHR',
    image: '/placeholder-product.jpg', originalPrice: 5.0, dealPrice: 2.5, discount: 50,
    stock: 300, minQty: 30, category: 'Cases', tag: 'hot-deal',
  },
  {
    id: '6', name: '3-in-1 MagSafe Wireless Charger', skuCode: 'DEAL-MAG3IN1',
    image: '/placeholder-product.jpg', originalPrice: 12.0, dealPrice: 7.2, discount: 40,
    stock: 150, minQty: 20, category: 'Chargers', tag: 'flash-sale',
    endsAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
  },
];

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);

  return (
    <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
      <Clock className="h-3 w-3" />
      {remaining}
    </span>
  );
}

function DealsContent() {
  const [deals, setDeals] = useState<DealProduct[]>(DEMO_DEALS);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/products', {
          params: { category: 'deals', limit: 20 },
        });
        if (data?.data?.length) {
          // Merge with API data when available
        }
      } catch {
        // Use demo data
      }
    };
    load();
  }, []);

  const filtered =
    activeTab === 'all' ? deals : deals.filter((d) => d.tag === activeTab);

  const getQty = (id: string, minQty: number) => quantities[id] ?? minQty;

  const setQty = (id: string, qty: number, minQty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(minQty, qty),
    }));
  };

  const addToCart = async (deal: DealProduct) => {
    setAddingToCart(deal.id);
    try {
      await api.post('/cart/items', {
        skuCode: deal.skuCode,
        qty: getQty(deal.id, deal.minQty),
      });
      toast.success(`${deal.name} added to cart`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Special Deals & Clearance
            </h1>
            <p className="text-sm text-muted-foreground">
              High-margin opportunities — limited stock, first come first served
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.key !== 'all' && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs">
                  {deals.filter((d) => d.tag === tab.key).length}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Package className="h-16 w-16 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">No deals in this category</h2>
            <p className="text-sm text-muted-foreground">Check back later for new offers</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deal) => (
            <Card
              key={deal.id}
              className="group overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardContent className="p-0">
                {/* Image + badge */}
                <div className="relative aspect-[16/10] bg-muted/30">
                  <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
                    <Badge className="bg-red-500 text-white hover:bg-red-600">
                      -{deal.discount}%
                    </Badge>
                    {deal.tag === 'flash-sale' && (
                      <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                        <Zap className="mr-1 h-3 w-3" />
                        Flash Sale
                      </Badge>
                    )}
                    {deal.tag === 'clearance' && (
                      <Badge className="bg-purple-500 text-white hover:bg-purple-600">
                        Clearance
                      </Badge>
                    )}
                  </div>
                  {deal.endsAt && (
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-1 shadow-sm">
                      <Countdown endsAt={deal.endsAt} />
                    </div>
                  )}
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground/20" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{deal.category}</p>
                    <h3 className="mt-0.5 text-sm font-medium text-foreground line-clamp-2">
                      {deal.name}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {deal.skuCode}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-primary">
                      &euro;{deal.dealPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      &euro;{deal.originalPrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ unit</span>
                  </div>

                  {/* Stock & MOQ */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{deal.stock} in stock</span>
                    <span>MOQ: {deal.minQty}</span>
                  </div>

                  {/* Qty + Add to cart */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        onClick={() =>
                          setQty(
                            deal.id,
                            getQty(deal.id, deal.minQty) - deal.minQty,
                            deal.minQty
                          )
                        }
                        className="px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={deal.minQty}
                        value={getQty(deal.id, deal.minQty)}
                        onChange={(e) =>
                          setQty(
                            deal.id,
                            parseInt(e.target.value) || deal.minQty,
                            deal.minQty
                          )
                        }
                        className="w-16 border-x border-border bg-transparent py-1.5 text-center text-sm outline-none"
                      />
                      <button
                        onClick={() =>
                          setQty(
                            deal.id,
                            getQty(deal.id, deal.minQty) + deal.minQty,
                            deal.minQty
                          )
                        }
                        className="px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => addToCart(deal)}
                      disabled={addingToCart === deal.id}
                    >
                      {addingToCart === deal.id ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      ) : (
                        <ShoppingCart className="h-3.5 w-3.5" />
                      )}
                      Add
                    </Button>
                  </div>

                  <p className="text-right text-xs text-muted-foreground">
                    Subtotal: &euro;
                    {(deal.dealPrice * getQty(deal.id, deal.minQty)).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  return (
    <AuthGuard>
      <DealsContent />
    </AuthGuard>
  );
}
