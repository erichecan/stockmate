// Updated: 2026-03-18T22:56:10 - Admin 导航补齐配置与作业功能入口
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  Layers,
  Truck,
  Bell,
  Banknote,
  LayoutDashboard,
  Package,
  Tags,
  ListChecks,
  ShieldAlert,
} from 'lucide-react';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pricing', label: 'Tier Discount', icon: Tags },
  { href: '/admin/moq', label: 'MOQ Batch', icon: ListChecks },
  { href: '/admin/preorder-limits', label: 'Preorder Limit', icon: ShieldAlert },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/waves', label: 'Waves', icon: Layers },
  { href: '/admin/shipments', label: 'Shipments', icon: Truck },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/cash', label: 'Cash', icon: Banknote },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-56 shrink-0 border-r border-border bg-card">
        <div className="sticky top-16 flex flex-col gap-1 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-semibold">Admin</span>
          </div>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
