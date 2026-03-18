// 2026-03-17T12:38:00 - B2B header: add Admin nav link
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  ClipboardList,
  Grid3X3,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  RefreshCw,
  LayoutGrid,
  Tag,
  Ship,
  Shield,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/products', label: 'Products', icon: Grid3X3 },
  { href: '/cart', label: 'Cart', icon: ShoppingCart, authRequired: true },
  { href: '/orders', label: 'Orders', icon: ClipboardList, authRequired: true },
];

const QUICK_NAV = [
  { href: '/quick-reorder', label: 'Reorder', icon: RefreshCw },
  { href: '/bulk-order', label: 'Bulk', icon: LayoutGrid },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/preorder', label: 'Pre-Order', icon: Ship },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading, initialize, logout } =
    useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.authRequired || isAuthenticated
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-semibold tracking-tight text-foreground">
              StockMate
            </span>
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              Wholesale
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav
          className="hidden items-center gap-1 md:flex"
          role="navigation"
          aria-label="Main navigation"
        >
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {isAuthenticated && (
            <>
              <div className="mx-1 h-5 w-px bg-border" />
              {QUICK_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-2">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="hidden items-center gap-2 md:flex">
                  <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-1.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {user?.firstName || user?.email?.split('@')[0] || 'User'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout();
                      window.location.replace('/login');
                    }}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="hidden items-center gap-2 md:flex">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="gap-1.5">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
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

            {isAuthenticated && (
              <>
                <div className="mt-2 border-t border-border pt-2">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick Actions
                  </p>
                  {QUICK_NAV.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
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
              </>
            )}

            <div className="mt-2 border-t border-border pt-2">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {user?.firstName || user?.email?.split('@')[0] || 'User'}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      window.location.replace('/login');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full gap-1.5">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
