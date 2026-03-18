// 2026-03-17T10:10:00 - 产品目录: 无限滚动 + 批量库存查询优化
'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Package,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  images?: string[];
  categoryName?: string | null;
  brandName?: string | null;
  skus?: Array<{
    id: string;
    code: string;
    wholesalePrice?: number;
    minOrderQty?: number;
    stockStatus?: string;
    variantAttributes?: Record<string, string>;
  }>;
};

const PAGE_SIZE = 50;

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { isAuthenticated, initialize } = useAuthStore();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const observerRef = useRef<HTMLDivElement>(null);
  const hasMore = products.length < total;

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
    api
      .get('/public/categories', { params: { tenantSlug } })
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  // 2026-03-17T10:12:00 - 筛选/搜索变化时重置到第 1 页
  const fetchProducts = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params: Record<string, string | number> = {
          page: pageNum,
          limit: PAGE_SIZE,
        };
        if (initialQuery) params.q = initialQuery;
        if (selectedCategory) params.categoryId = selectedCategory;

        let result: { data: Product[]; total: number };

        if (isAuthenticated) {
          const { data: resp } = await api.get('/products', { params });
          result = resp;
        } else {
          params.tenantSlug =
            process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
          const { data: resp } = await api.get('/public/products', { params });
          result = resp;
        }

        const items = result?.data ?? [];
        const totalCount = result?.total ?? 0;

        setProducts((prev) => (append ? [...prev, ...items] : items));
        setTotal(totalCount);
      } catch {
        if (!append) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [initialQuery, selectedCategory, isAuthenticated],
  );

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [fetchProducts]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, true);
  }, [page, loadingMore, hasMore, fetchProducts]);

  // 2026-03-17T10:13:00 - IntersectionObserver 触发无限滚动
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? 'Loading...'
              : `${products.length} of ${total} products`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim())
                window.location.href = `/products?q=${encodeURIComponent(search.trim())}`;
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-60 pl-9"
                aria-label="Search products"
              />
            </div>
            <Button type="submit" variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <div className="hidden gap-1 sm:flex">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Category Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="h-4 w-4" />
                Categories
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-6 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : (
                <nav className="space-y-1" aria-label="Categories">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 ${
                      !selectedCategory
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <button
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 ${
                          selectedCategory === cat.id
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <span className="truncate">
                          {cat.nameEn || cat.name}
                        </span>
                        {cat.children && cat.children.length > 0 && (
                          <ChevronRight className="h-3 w-3 shrink-0" />
                        )}
                      </button>
                    </div>
                  ))}
                </nav>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Product Grid */}
        <div className="min-w-0 flex-1">
          {loading ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-3'
              }
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    viewMode === 'grid'
                      ? 'aspect-[3/4] animate-pulse rounded-xl bg-muted'
                      : 'h-24 animate-pulse rounded-xl bg-muted'
                  }
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16">
                <Package className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">No products found</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <ProductCardGrid
                      key={p.id}
                      product={p}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((p) => (
                    <ProductCardList
                      key={p.id}
                      product={p}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                </div>
              )}

              {/* 无限滚动触发器 + 加载更多按钮 */}
              <div ref={observerRef} className="mt-6 flex justify-center">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more...
                  </div>
                ) : hasMore ? (
                  <Button variant="outline" onClick={loadMore}>
                    Load More ({products.length} / {total})
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All {total} products loaded
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCardGrid({
  product,
  isAuthenticated,
}: {
  product: Product;
  isAuthenticated: boolean;
}) {
  const price = product.skus?.[0]?.wholesalePrice;
  const mainImage = product.images?.[0];

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group h-full overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md">
        <div className="aspect-square bg-muted">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.nameEn || product.name}
              width={400}
              height={400}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          {product.brandName && (
            <Badge variant="secondary" className="mb-2 text-xs">
              {product.brandName}
            </Badge>
          )}
          <h3 className="line-clamp-2 text-sm font-medium text-foreground">
            {product.nameEn || product.name}
          </h3>
          <div className="mt-3">
            {isAuthenticated && price ? (
              <p className="text-lg font-semibold text-primary">
                &euro;{Number(price).toFixed(2)}
              </p>
            ) : (
              <p className="text-sm text-primary">
                {isAuthenticated
                  ? 'Price on request'
                  : 'Sign in to view price'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProductCardList({
  product,
  isAuthenticated,
}: {
  product: Product;
  isAuthenticated: boolean;
}) {
  const price = product.skus?.[0]?.wholesalePrice;
  const mainImage = product.images?.[0];

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group transition-all duration-200 hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex gap-4 p-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={product.nameEn || product.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/20" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {product.brandName && (
              <Badge variant="secondary" className="mb-1 text-xs">
                {product.brandName}
              </Badge>
            )}
            <h3 className="text-sm font-medium text-foreground">
              {product.nameEn || product.name}
            </h3>
            <div className="mt-2">
              {isAuthenticated && price ? (
                <p className="text-base font-semibold text-primary">
                  &euro;{Number(price).toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-primary">
                  {isAuthenticated
                    ? 'Price on request'
                    : 'Sign in to view price'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
