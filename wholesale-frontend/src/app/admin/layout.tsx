// Updated: 2026-03-18T22:56:10 - Admin 导航补齐配置与作业功能入口
// Updated: 2026-03-20T16:45:00 - CATALOG_ADMIN 仅见商品/价格/限购；零售商角色不可进 /admin
// Updated: 2026-03-20T18:22:30 - 网站管理侧栏置顶「商品管理」（主数据与主图）
// Updated: 2026-03-20T19:05:00 - 移除责任矩阵入口；CATALOG_ADMIN 越权重定向至商品管理
// Updated: 2026-03-20T19:35:22 - main 增加 min-w-0，避免 flex 子项撑开导致横屏无滚动、操作列被裁切（演示 iframe 内尤甚）
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Layers,
  Truck,
  Bell,
  Banknote,
  LayoutDashboard,
  Images,
  Package,
  Tags,
  ListChecks,
  ShieldAlert,
  Undo2,
  Users,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import {
  isCatalogOnlyAdminRole,
  isRetailProcurementRole,
} from '@/lib/wholesale-roles';

const FULL_ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: '商品管理', icon: Images },
  { href: '/admin/pricing', label: 'Tier Discount', icon: Tags },
  { href: '/admin/moq', label: 'MOQ Batch', icon: ListChecks },
  { href: '/admin/preorder-limits', label: 'Preorder Limit', icon: ShieldAlert },
  { href: '/admin/orders', label: '订单管理', icon: ClipboardList },
  { href: '/admin/warehouse-waves', label: '仓库拣货看板', icon: Layers },
  { href: '/admin/shipments', label: 'Shipments', icon: Truck },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/staff', label: 'Staff', icon: Users },
  { href: '/admin/cash', label: 'Cash', icon: Banknote },
  { href: '/admin/returns', label: '退货工作台', icon: Undo2 },
];

const CATALOG_ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: '商品管理', icon: Images },
  { href: '/admin/pricing', label: 'Tier Discount', icon: Tags },
  { href: '/admin/moq', label: 'MOQ Batch', icon: ListChecks },
  { href: '/admin/preorder-limits', label: 'Preorder Limit', icon: ShieldAlert },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
];

const CATALOG_BLOCKED_PATHS = [
  '/admin/orders',
  '/admin/warehouse-waves',
  '/admin/shipments',
  '/admin/cash',
  '/admin/returns',
  '/admin/staff',
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;
    if (isRetailProcurementRole(user?.role)) {
      router.replace('/');
    }
  }, [isLoading, user?.role, router]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (!isCatalogOnlyAdminRole(user.role)) return;
    if (CATALOG_BLOCKED_PATHS.some((p) => pathname.startsWith(p))) {
      router.replace('/admin/products');
    }
  }, [pathname, user, isLoading, router]);

  const nav = useMemo(() => {
    if (isCatalogOnlyAdminRole(user?.role)) return CATALOG_ADMIN_NAV;
    return FULL_ADMIN_NAV;
  }, [user?.role]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-56 shrink-0 border-r border-border bg-card">
        <div className="sticky top-16 flex flex-col gap-1 p-4">
          <div className="mb-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold">Admin</span>
            </div>
            {isCatalogOnlyAdminRole(user?.role) && (
              <p className="text-xs text-muted-foreground">
                网站管理 · 商品、图片与价格
              </p>
            )}
          </div>
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-auto overflow-y-auto">{children}</main>
    </div>
  );
}
