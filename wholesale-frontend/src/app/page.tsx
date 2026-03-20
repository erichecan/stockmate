// 2026-03-17T00:25:00 - B2B 极简采购大盘: command-center style dashboard for instant ordering
// 2026-03-20T16:45:00 - 零售商角色（VIEWER/RETAIL_BUYER）强化中文「专业采购台」文案
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  RefreshCw,
  LayoutGrid,
  Tag,
  Ship,
  CreditCard,
  Euro,
  TrendingUp,
  ArrowRight,
  Search,
  ShieldCheck,
  Truck,
  Clock,
  Package,
  ShoppingCart,
  FileText,
  Zap,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import { isRetailProcurementRole } from '@/lib/wholesale-roles';
import api from '@/lib/api';
import { toImageProxyUrl } from '@/lib/image-proxy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type CategoryNode = {
  id: string;
  name: string;
  nameEn?: string;
  children?: CategoryNode[];
};

type Product = {
  id: string;
  name: string;
  nameEn?: string;
  mainImage?: string;
};

const QUICK_ACTIONS = [
  {
    key: 'reorder',
    label: 'Quick Reorder',
    zhLabel: '再来一单',
    desc: 'Repeat your last purchase with one click',
    zhDesc: '一键复购上次清单，改数量即下单',
    icon: RefreshCw,
    href: '/quick-reorder',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    key: 'bulk',
    label: 'Bulk Order',
    zhLabel: '批量下单',
    desc: 'Enter SKUs in a spreadsheet-style matrix',
    zhDesc: '表格式录入 SKU + 数量，熟客补货最快',
    icon: LayoutGrid,
    href: '/bulk-order',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    key: 'deals',
    label: 'Special Deals',
    zhLabel: '特价 / 清仓',
    desc: 'Clearance and special price items',
    zhDesc: '高周转与清仓品集中选购',
    icon: Tag,
    href: '/deals',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    key: 'preorder',
    label: 'Pre-Order',
    zhLabel: '预售 / 期货',
    desc: 'Reserve items from incoming shipments',
    zhDesc: '到港前锁货，按规则付定/尾款',
    icon: Ship,
    href: '/preorder',
    color: 'text-violet-600 bg-violet-50',
  },
];

export default function HomePage() {
  const { isAuthenticated, isLoading, user, initialize } = useAuthStore();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const load = async () => {
      try {
        const tenantSlug =
          process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
        const [catRes, prodRes] = await Promise.all([
          api.get('/public/categories', { params: { tenantSlug } }),
          api.get('/public/products', { params: { tenantSlug } }),
        ]);
        setCategories(catRes.data || []);
        // Updated: 2026-03-19T10:24:35 - 兼容分页响应结构，首页推荐商品使用 data 字段
        const productPayload = prodRes.data;
        if (Array.isArray(productPayload)) {
          setProducts(productPayload);
        } else if (Array.isArray(productPayload?.data)) {
          setProducts(productPayload.data);
        } else {
          setProducts([]);
        }
      } catch {
        // Silent fallback
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? (
    <AuthenticatedHome
      user={user}
      categories={categories}
      products={products}
      dataLoading={dataLoading}
      search={search}
      setSearch={setSearch}
    />
  ) : (
    <GuestHome
      categories={categories}
      products={products}
      dataLoading={dataLoading}
      search={search}
      setSearch={setSearch}
    />
  );
}

/* ─── Authenticated Dashboard: 极简采购大盘 ─── */
function AuthenticatedHome({
  user,
  categories,
  products,
  dataLoading,
  search,
  setSearch,
}: {
  user: { id: string; email: string; firstName: string | null; lastName: string | null; role: string; tenantId: string } | null;
  categories: CategoryNode[];
  products: Product[];
  dataLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
}) {
  const creditUsed = 1500;
  const creditLimit = 20000;
  const creditPercent = Math.round((creditUsed / creditLimit) * 100);
  const retailZh = isRetailProcurementRole(user?.role);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Top Bar: greeting + global search ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {retailZh
              ? user?.firstName
                ? `${user.firstName}，专业采购台`
                : '专业采购台'
              : user?.firstName
                ? `${user.firstName}, ready to order`
                : 'Purchasing Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {retailZh
              ? '快 · 准 · 省时间 — 面向零售商的一站式下单入口'
              : 'See it · Click it · Done — your 30-second ordering hub'}
          </p>
        </div>
        <form
          className="flex w-full max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim())
              window.location.href = `/products?q=${encodeURIComponent(search.trim())}`;
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="SKU, product name, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <Button type="submit" size="default">
            Search
          </Button>
        </form>
      </div>

      {/* ── Credit Strip: compact, always visible ── */}
      <section
        aria-label="Account overview"
        className="mb-6 rounded-xl border border-border bg-card p-4"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Available Credit</span>
                <span className="text-sm font-bold text-primary">
                  &euro;{(creditLimit - creditUsed).toLocaleString()}
                </span>
              </div>
              <Progress value={100 - creditPercent} className="mt-1 h-1.5" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {creditPercent}% of &euro;{creditLimit.toLocaleString()} used
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Euro className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-sm font-bold text-foreground">
                &euro;{creditUsed.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Due Apr 15, 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Last Order</p>
              <div className="flex items-center gap-2">
                <Link
                  href="/orders/SO-2026031"
                  className="text-sm font-bold text-foreground hover:text-primary"
                >
                  #SO-2026031
                </Link>
                <Badge className="h-5 bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">
                  Shipped
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Mar 14, 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 四大核心快捷键: dominant action cards ── */}
      <section aria-label="Quick actions" className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {retailZh ? '核心采购入口' : 'Quick Actions'}
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const label = retailZh ? action.zhLabel : action.label;
            const desc = retailZh ? action.zhDesc : action.desc;
            return (
              <Link key={action.key} href={action.href}>
                <Card className="group relative h-full cursor-pointer overflow-hidden border-2 border-transparent transition-all duration-200 hover:border-primary hover:shadow-lg">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color} transition-transform duration-200 group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {label}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      Open <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Draft cart reminder ── */}
      <section className="mb-8">
        <Link href="/cart">
          <Card className="group cursor-pointer border-dashed border-primary/30 bg-primary/5 transition-all duration-200 hover:border-primary hover:bg-primary/10">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    You have items in your cart
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3 items · &euro;245.00 — continue checkout or modify
                  </p>
                </div>
              </div>
              <Button variant="default" size="sm" className="gap-1">
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* ── Secondary: browse + view orders ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Categories - 2 cols */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Browse Categories
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {(categories.length > 0
                ? categories.slice(0, 8)
                : FALLBACK_CATEGORIES
              ).map((cat) => (
                <Link key={cat.id} href={`/categories/${cat.id}`}>
                  <div className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Package className="h-4 w-4" />
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">
                      {cat.nameEn || cat.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links: orders + statements */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </h2>
          <div className="space-y-2">
            <Link href="/orders">
              <Card className="group transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">My Orders</p>
                    <p className="text-xs text-muted-foreground">Track & manage</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/products">
              <Card className="group transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50">
                    <Package className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">All Products</p>
                    <p className="text-xs text-muted-foreground">Full catalog</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/deals">
              <Card className="group border-orange-100 transition-all duration-200 hover:border-orange-300 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-50">
                    <Tag className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Today&apos;s Deals</p>
                    <p className="text-xs text-orange-600 font-medium">6 active offers</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      {products.length > 0 && (
        <section aria-label="Featured products" className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Featured Products
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/products/${p.id}`}>
                <Card className="group overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                  <div className="aspect-square bg-muted">
                    {p.mainImage ? (
                      <Image
                        src={
                          toImageProxyUrl(p.mainImage, 'list') || p.mainImage
                        }
                        alt={p.nameEn || p.name}
                        width={300}
                        height={300}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">
                      {p.nameEn || p.name}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Guest Landing ─── */
function GuestHome({
  categories,
  products,
  dataLoading,
  search,
  setSearch,
}: {
  categories: CategoryNode[];
  products: Product[];
  dataLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 text-xs">
              Ireland&apos;s Leading B2B Platform
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Phone Accessories
              <br />
              <span className="text-primary">Wholesale Platform</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Browse 3,000+ products from top suppliers. Competitive wholesale
              pricing, fast EU delivery, and dedicated account management.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-8">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="gap-2 px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <form
            className="mx-auto mt-10 flex max-w-lg gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim())
                window.location.href = `/products?q=${encodeURIComponent(search.trim())}`;
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cases, cables, chargers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 bg-card pl-9 text-base shadow-sm"
                aria-label="Search products"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-b border-border bg-card py-8">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            {
              icon: ShieldCheck,
              title: 'Verified Suppliers',
              desc: 'All products sourced from certified manufacturers',
            },
            {
              icon: Truck,
              title: 'Fast EU Delivery',
              desc: 'Direct from our Dublin warehouse to your door',
            },
            {
              icon: Clock,
              title: 'Flexible Credit Terms',
              desc: 'Up to 30-day payment terms for qualified buyers',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Product Categories
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(categories.length > 0
                ? categories.slice(0, 8)
                : FALLBACK_CATEGORIES
              ).map((cat) => (
                <Link key={cat.id} href={`/categories/${cat.id}`}>
                  <Card className="group transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {cat.nameEn || cat.name}
                        </p>
                        {cat.children && cat.children.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {cat.children.length} subcategories
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="bg-card py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                Featured Products
              </h2>
              <Link
                href="/products"
                className="flex items-center gap-1 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.slice(0, 8).map((p) => (
                <Link key={p.id} href={`/products/${p.id}`}>
                  <Card className="group overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                    <div className="aspect-square bg-muted">
                      {p.mainImage ? (
                        <Image
                          src={
                            toImageProxyUrl(p.mainImage, 'list') || p.mainImage
                          }
                          alt={p.nameEn || p.name}
                          width={300}
                          height={300}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="line-clamp-2 text-sm font-medium text-foreground">
                        {p.nameEn || p.name}
                      </h3>
                      <p className="mt-2 text-xs text-primary">
                        Sign in to view wholesale price
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:p-12">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Ready to start ordering?
              </h2>
              <p className="max-w-md text-primary-foreground/80">
                Create your wholesale account today and get access to exclusive
                pricing, bulk discounts, and flexible payment terms.
              </p>
              <div className="flex gap-3">
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 px-8 font-semibold"
                  >
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 border-primary-foreground/20 px-8 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

const FALLBACK_CATEGORIES: CategoryNode[] = [
  { id: 'cases', name: 'Cases & Covers', nameEn: 'Cases & Covers' },
  { id: 'glass', name: 'Tempered Glass', nameEn: 'Screen Protectors' },
  { id: 'cables', name: 'Cables & Chargers', nameEn: 'Cables & Chargers' },
  { id: 'audio', name: 'Audio', nameEn: 'Earphones & Audio' },
  { id: 'power', name: 'Power Banks', nameEn: 'Power Banks' },
  { id: 'mounts', name: 'Mounts & Stands', nameEn: 'Mounts & Stands' },
  { id: 'parts', name: 'Repair Parts', nameEn: 'Repair Parts' },
  { id: 'brands', name: 'Big Brands', nameEn: 'Big Brands' },
];
