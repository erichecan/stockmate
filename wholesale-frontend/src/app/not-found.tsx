// 2026-03-15 P0：批发站 404 页（PRD 未要求，便于用户友好提示）
import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="space-y-4 py-8 text-center">
      <h1 className="text-xl font-semibold text-foreground">页面未找到</h1>
      <p className="text-sm text-muted-foreground">
        您访问的页面不存在，请检查链接或返回首页。
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="rounded border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          返回首页
        </Link>
        <Link
          href="/categories"
          className="rounded border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          商品类目
        </Link>
      </div>
    </section>
  );
}
