// 2026-03-16T22:52:00 - B2B Wholesale Platform layout: professional header with auth-aware nav
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site-header";

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
  title: "StockMate Wholesale | B2B Phone Accessories",
  description:
    "B2B wholesale platform for phone accessories in Ireland & Europe. Browse, order, and manage your inventory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <QueryProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />

            {/* 2026-03-20T19:35:22 - min-w-0：嵌套 admin 双栏 flex 时允许子区正确收缩与横向滚动 */}
            <main className="min-w-0 flex-1" id="main-content">
              {children}
            </main>

            <footer className="border-t border-border bg-card">
              <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
                <p>&copy; 2026 StockMate. All rights reserved.</p>
                <div className="flex gap-4">
                  <a
                    href="/terms"
                    className="transition-colors duration-200 hover:text-foreground"
                  >
                    Terms
                  </a>
                  <a
                    href="/privacy"
                    className="transition-colors duration-200 hover:text-foreground"
                  >
                    Privacy
                  </a>
                  <a
                    href="/contact"
                    className="transition-colors duration-200 hover:text-foreground"
                  >
                    Contact
                  </a>
                </div>
              </div>
            </footer>
          </div>

          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
