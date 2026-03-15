// 2026-03-15 UI/UX Pro Max：登录/注册布局，主题色、对比度、浮动卡片间距
// 显式引入全局样式，避免 (auth) 路由单独打包时未加载 globals.css
'use client';

import "../globals.css";
import { Package } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 背景：主题色渐变 + 径向，保证与主站一致且不抢镜 */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-muted/50 via-background to-muted/30"
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/0.08,transparent)]"
        aria-hidden
      />

      {/* 内容区：Pro Max 浮动间距 top-4，避免贴边 */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 pt-12">
        <div className="w-full max-w-[400px]">
          {/* 品牌区：图标 + 标题，对比度用 text-foreground / text-muted-foreground */}
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md transition-shadow duration-200 hover:shadow-lg"
              aria-hidden
            >
              <Package className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                StockFlow
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                手机配件批发进销存
              </p>
            </div>
          </div>

          {/* 子页面（登录/注册）卡片容器 */}
          {children}
        </div>
      </div>
    </div>
  );
}
