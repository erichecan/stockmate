// 2026-03-16T23:10:00 - B2B Auth layout: professional, clean, European-market focused
'use client';

import "../globals.css";
import Link from "next/link";
import { Package } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-primary/10"
        aria-hidden
      />

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Package className="h-6 w-6" />
              </div>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                StockMate
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                B2B Wholesale Platform
              </p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
