// 2026-03-15 P0：类目导航页，未登录可访问，调用 /public/categories（见 docs/wholesale-station-p0-spec.md）
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const tenantSlug =
          process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
        const res = await api.get('/public/categories', {
          params: { tenantSlug },
        });
        setCategories(res.data || []);
      } catch {
        setError('加载类目失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="space-y-4" aria-labelledby="categories-heading">
      <h1 id="categories-heading" className="text-xl font-semibold text-foreground">
        商品类目
      </h1>
      <p className="text-sm text-muted-foreground">
        未登录可浏览类目，点击进入该类目商品列表；登录后可见价格与库存并下单。
      </p>
      {loading && <p className="text-sm text-muted-foreground">加载中…</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && (
        <ul className="space-y-3 list-none p-0 m-0" role="list">
          {categories.map((c) => (
            <li key={c.id}>
              <a
                href={`/categories/${c.id}`}
                className="block rounded-md border border-border bg-card px-3 py-2 text-foreground font-medium transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
              >
                {c.name}
              </a>
              {c.children && c.children.length > 0 && (
                <ul className="mt-2 ml-4 space-y-1 list-none p-0" role="list">
                  {c.children.map((sc) => (
                    <li key={sc.id}>
                      <a
                        href={`/categories/${sc.id}`}
                        className="block rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                      >
                        {sc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {categories.length === 0 && (
            <li className="text-sm text-muted-foreground">暂无类目</li>
          )}
        </ul>
      )}
    </section>
  );
}
