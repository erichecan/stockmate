// Updated: 2026-02-27T04:35:00
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Barcode,
  Menu,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Truck,
  Warehouse,
  ShoppingCart,
  PackageSearch,
  QrCode,
  Users,
  FileText,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Updated: 2026-02-28T10:05:00
const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard, group: '概览' },
  { href: '/dashboard/products', label: '产品', icon: Package, group: '商品' },
  { href: '/dashboard/categories', label: '分类', icon: FolderTree, group: '商品' },
  { href: '/dashboard/brands', label: '品牌', icon: Tag, group: '商品' },
  { href: '/dashboard/skus', label: 'SKU', icon: Barcode, group: '商品' },
  { href: '/dashboard/suppliers', label: '供应商', icon: Truck, group: '采购' },
  { href: '/dashboard/purchasing', label: '采购单', icon: ShoppingCart, group: '采购' },
  { href: '/dashboard/customers', label: '客户', icon: Users, group: '销售' },
  { href: '/dashboard/sales-orders', label: '销售订单', icon: FileText, group: '销售' },
  { href: '/dashboard/warehouses', label: '仓库', icon: Warehouse, group: '库存' },
  { href: '/dashboard/inventory', label: '库存', icon: PackageSearch, group: '库存' },
  { href: '/dashboard/barcode', label: '条码打印', icon: QrCode, group: '工具' },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const groups = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const group = item.group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <nav className="flex flex-col gap-4 px-3">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group}
          </p>
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline-block">
            {user?.firstName} {user?.lastName}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user?.firstName} {user?.lastName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user?.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          个人资料
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          设置
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:flex md:flex-col">
          <div className="flex h-14 items-center gap-2 px-6">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">StockFlow</span>
          </div>
          {user?.tenant && (
            <div className="px-6 pb-4">
              <p className="truncate text-xs text-muted-foreground">
                {user.tenant.name}
              </p>
            </div>
          )}
          <Separator />
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNav />
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-2">
              {/* Mobile menu trigger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">打开菜单</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="px-6 pt-6">
                    <SheetTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      StockFlow
                    </SheetTitle>
                  </SheetHeader>
                  {user?.tenant && (
                    <div className="px-6 pb-2 pt-1">
                      <p className="truncate text-xs text-muted-foreground">
                        {user.tenant.name}
                      </p>
                    </div>
                  )}
                  <Separator />
                  <div className="py-4">
                    <SidebarNav onNavigate={() => setMobileOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              <span className="text-lg font-semibold md:hidden">StockFlow</span>
            </div>
            <UserMenu />
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
