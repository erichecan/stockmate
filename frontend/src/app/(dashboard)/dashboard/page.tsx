// Updated: 2026-02-27T04:45:00
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Barcode, FolderTree, Tag, ArrowRight, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  products: number;
  skus: number;
  categories: number;
  brands: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({ products: 0, skus: 0, categories: 0, brands: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [productsRes, skusRes, categoriesRes, brandsRes] = await Promise.all([
          api.get('/products?page=1&limit=1').catch(() => ({ data: { total: 0 } })),
          api.get('/skus?page=1&limit=1').catch(() => ({ data: { total: 0 } })),
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/brands').catch(() => ({ data: [] })),
        ]);

        setStats({
          products: productsRes.data?.total ?? productsRes.data?.length ?? 0,
          skus: skusRes.data?.total ?? skusRes.data?.length ?? 0,
          categories: Array.isArray(categoriesRes.data) ? categoriesRes.data.filter((c: { isActive: boolean }) => c.isActive).length : 0,
          brands: Array.isArray(brandsRes.data) ? brandsRes.data.filter((b: { isActive: boolean }) => b.isActive).length : 0,
        });
      } catch {
        // Silently fail, show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      title: '总产品数',
      value: stats.products,
      description: '已录入的产品总数',
      icon: Package,
      href: '/dashboard/products',
    },
    {
      title: '总 SKU 数',
      value: stats.skus,
      description: '所有产品的 SKU 总数',
      icon: Barcode,
      href: '/dashboard/skus',
    },
    {
      title: '活跃分类',
      value: stats.categories,
      description: '启用中的产品分类',
      icon: FolderTree,
      href: '/dashboard/categories',
    },
    {
      title: '活跃品牌',
      value: stats.brands,
      description: '启用中的产品品牌',
      icon: Tag,
      href: '/dashboard/brands',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          欢迎回来，{user?.firstName || '用户'}
        </h1>
        <p className="text-muted-foreground">
          StockFlow 帮助您高效管理手机配件的进销存，轻松掌控库存动态。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="text-2xl font-bold">{stat.value}</div>
                  )}
                  <CardDescription className="mt-1">
                    {stat.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>快速开始</CardTitle>
          <CardDescription>
            按照以下步骤开始使用 StockFlow 管理您的库存
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/categories">
              <div className="group rounded-lg border p-4 transition-colors hover:border-primary hover:bg-accent">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">1. 创建分类</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  设置产品分类体系，例如：手机壳 → iPhone → iPhone 16 Pro Max
                </p>
              </div>
            </Link>
            <Link href="/dashboard/brands">
              <div className="group rounded-lg border p-4 transition-colors hover:border-primary hover:bg-accent">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">2. 添加品牌</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  录入您经营的手机配件品牌，如 Apple、Samsung 等。
                </p>
              </div>
            </Link>
            <Link href="/dashboard/products">
              <div className="group rounded-lg border p-4 transition-colors hover:border-primary hover:bg-accent">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">3. 录入产品</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  添加产品并创建 SKU 变体，系统将自动生成编码和条码。
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {user?.tenant && (
        <Card>
          <CardHeader>
            <CardTitle>租户信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">公司名称：</span>
                <span className="font-medium">{user.tenant.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">公司标识：</span>
                <span className="font-mono text-xs">{user.tenant.slug}</span>
              </div>
              <div>
                <span className="text-muted-foreground">套餐：</span>
                <span className="font-medium">{user.tenant.plan}</span>
              </div>
              <div>
                <span className="text-muted-foreground">角色：</span>
                <span className="font-medium">{user.role}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
