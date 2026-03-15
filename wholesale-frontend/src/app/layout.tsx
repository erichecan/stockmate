// Updated: 2026-03-15 - 批发站前台布局；P0：未登录可浏览类目与部分商品，登录后查看价格与下单
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "批发站 · StockFlow",
  description: "面向零售商的批发订货网站",
};

const navLinkClass =
  "rounded px-2 py-1 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <QueryProvider>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4">
            <header className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <div className="text-lg font-semibold text-foreground">
                  批发站 Wholesale
                </div>
                <p className="text-xs text-muted-foreground">
                  未登录可浏览类目与部分商品，登录后查看价格与下单
                </p>
              </div>
              <nav className="flex gap-1 text-xs" role="navigation" aria-label="主导航">
                <a href="/" className={navLinkClass}>
                  首页
                </a>
                <a href="/categories" className={navLinkClass}>
                  商品类目
                </a>
                <a href="/cart" className={navLinkClass}>
                  购物车
                </a>
                <a href="/orders" className={navLinkClass}>
                  我的订单
                </a>
                <a href="/login" className={navLinkClass}>
                  登录
                </a>
              </nav>
            </header>

            <main className="flex-1 pb-6 pt-0" id="main-content" suppressHydrationWarning>
              {children}
            </main>

            <footer className="mt-auto border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
              StockFlow 批发站 · Demo UI
            </footer>
          </div>

          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
