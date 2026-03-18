// 2026-03-16T23:22:00 - Product detail page: auth-aware pricing, stock status, add-to-cart
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  ShoppingCart,
  Minus,
  Plus,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Updated: 2026-03-17T12:39:00 - SKU 类型: 添加 retailPrice 以修复构建
type Sku = {
  id: string;
  code: string;
  variantAttributes?: Record<string, string>;
  wholesalePrice?: number;
  retailPrice?: number;
  minOrderQty?: number;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
};

type ProductDetail = {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  images?: string[];
  categoryName?: string | null;
  brandName?: string | null;
  skus?: Sku[];
};

const STOCK_STATUS = {
  IN_STOCK: {
    label: 'In Stock',
    icon: CheckCircle2,
    class: 'text-emerald-600 bg-emerald-50',
  },
  LOW_STOCK: {
    label: 'Low Stock',
    icon: Clock,
    class: 'text-amber-600 bg-amber-50',
  },
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    icon: AlertCircle,
    class: 'text-red-600 bg-red-50',
  },
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { isAuthenticated, initialize } = useAuthStore();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState<Sku | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Updated: 2026-03-16T23:48:00 - P0 闭环: 认证用户走 /products/:id（含价格/库存），未登录走 public
  useEffect(() => {
    const load = async () => {
      try {
        if (isAuthenticated) {
          const { data } = await api.get(`/products/${productId}`);
          setProduct(data);
          if (data?.skus?.length > 0) {
            setSelectedSku(data.skus[0]);
          }
        } else {
          const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
          const { data } = await api.get(`/public/products/${productId}`, {
            params: { tenantSlug },
          });
          setProduct(data);
          if (data?.skus?.length > 0) {
            setSelectedSku(data.skus[0]);
          }
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, isAuthenticated]);

  const handleAddToCart = async () => {
    if (!selectedSku || !isAuthenticated) return;
    setAddingToCart(true);
    try {
      // Updated: 2026-03-16T23:49:00 - P0 闭环: 字段名 qty→quantity 与后端 AddCartItemDto 对齐
      await api.post('/cart/items', {
        skuId: selectedSku.id,
        quantity,
      });
      toast.success(`Added ${quantity}x to cart`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Package className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Product not found
        </h2>
        <Link href="/products">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  // Updated: 2026-03-16T23:50:00 - P0 闭环: 使用认证 API 返回的真实库存状态
  const stockKey: keyof typeof STOCK_STATUS =
    ((selectedSku as any)?.stockStatus as keyof typeof STOCK_STATUS) || 'IN_STOCK';
  const stockInfo = STOCK_STATUS[stockKey];
  const StockIcon = stockInfo.icon;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/products"
          className="transition-colors duration-200 hover:text-foreground"
        >
          Products
        </Link>
        <ChevronRight className="h-4 w-4" />
        {product.categoryName && (
          <>
            <span className="text-muted-foreground">
              {product.categoryName}
            </span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="truncate text-foreground">
          {product.nameEn || product.name}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="overflow-hidden rounded-2xl border border-border bg-muted">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.nameEn || product.name}
              width={600}
              height={600}
              className="h-full w-full object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex aspect-square items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground/20" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            {product.brandName && (
              <Badge variant="secondary" className="mb-2">
                {product.brandName}
              </Badge>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {product.nameEn || product.name}
            </h1>
          </div>

          {/* Pricing */}
          <Card>
            <CardContent className="p-5">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-primary">
                      &euro;
                      {selectedSku?.wholesalePrice
                        ? Number(selectedSku.wholesalePrice).toFixed(2)
                        : '—'}
                    </span>
                    {selectedSku?.retailPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        &euro;{Number(selectedSku.retailPrice).toFixed(2)}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      / unit
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${stockInfo.class}`}
                    >
                      <StockIcon className="h-3.5 w-3.5" />
                      {stockInfo.label}
                    </div>
                    {selectedSku?.code && (
                      <span className="text-xs text-muted-foreground">
                        SKU: {selectedSku.code}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-lg font-medium text-foreground">
                    Wholesale Price Available
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sign in to your account to view wholesale pricing and place
                    orders.
                  </p>
                  <div className="flex gap-2">
                    <Link href="/login">
                      <Button>Sign In</Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="outline">Create Account</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SKU selector */}
          {isAuthenticated &&
            product.skus &&
            product.skus.length > 1 && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Variants
                </p>
                <div className="flex flex-wrap gap-2">
                    {product.skus.map((sku) => {
                    const label = sku.variantAttributes
                      ? Object.values(sku.variantAttributes).join(' / ')
                      : sku.code;
                    return (
                      <button
                        key={sku.id}
                        onClick={() => setSelectedSku(sku)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors duration-200 ${
                          selectedSku?.id === sku.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Quantity + Add to Cart */}
          {isAuthenticated && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Quantity
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-20 text-center"
                    aria-label="Quantity"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handleAddToCart}
                  disabled={addingToCart || (stockKey as string) === 'OUT_OF_STOCK'}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </Button>
              </div>

              {selectedSku?.wholesalePrice && (
                <p className="text-sm text-muted-foreground">
                  Subtotal:{' '}
                  <span className="font-semibold text-foreground">
                    &euro;
                    {(Number(selectedSku.wholesalePrice) * quantity).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {(product.descriptionEn || product.description) && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                Description
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.descriptionEn || product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
