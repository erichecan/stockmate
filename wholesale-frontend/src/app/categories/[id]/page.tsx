// Updated: 2026-03-15 - 批发站: 类目商品列表 + 搜索 + 简单分页；支持 Next 15+ params Promise，无 id 不请求
'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

type CategoryPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

type ProductItem = {
  id: string;
  name: string;
  nameEn?: string | null;
};

function resolveId(params: CategoryPageProps['params']): string | null {
  if (params === null || params === undefined) return null;
  if (typeof (params as Promise<unknown>)?.then === 'function') return null;
  return (params as { id: string }).id ?? null;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const [resolvedId, setResolvedId] = useState<string | null>(() =>
    resolveId(params),
  );
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    let cancelled = false;
    if (typeof (params as Promise<unknown>)?.then === 'function') {
      (params as Promise<{ id: string }>).then((r) => {
        if (!cancelled) setResolvedId(r?.id ?? null);
      });
    } else {
      setResolvedId((params as { id: string })?.id ?? null);
    }
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    const id = resolvedId;
    if (!id) {
      setLoading(false);
      setItems([]);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const tenantSlug =
          process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
        let token: string | null = null;
        if (typeof window !== 'undefined') {
          token = localStorage.getItem('accessToken');
        }

        const endpoint = token ? '/products' : '/public/products';
        const query: Record<string, string> = { categoryId: id };
        if (!token) {
          query.tenantSlug = tenantSlug;
        }

        const res = await api.get(endpoint, {
          params: query,
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        });

        setItems(Array.isArray(res.data) ? res.data : []);
      } catch (_e) {
        setError('加载类目商品失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedId]);

  const filtered = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((p) => {
      const name = (p.name ?? '').toLowerCase();
      const nameEn = (p.nameEn ?? '').toLowerCase();
      return name.includes(kw) || nameEn.includes(kw);
    });
  }, [items, searchKeyword]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">类目商品列表</h2>
        <p className="text-sm text-muted-foreground">
          {resolvedId
            ? `当前类目 ID：${resolvedId}，根据是否登录自动选择公开/批发接口。`
            : '正在加载类目…'}
        </p>
      </header>

      <div className="flex items-center gap-2">
        <label htmlFor="category-search" className="sr-only">
          搜索当前类目商品（名称或英文名）
        </label>
        <input
          id="category-search"
          type="search"
          aria-label="搜索当前类目商品"
          className="h-8 w-64 rounded border border-input bg-background px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="搜索当前类目商品（名称 / 英文名）"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>

      {!resolvedId && <p className="text-sm text-muted-foreground">加载类目信息中…</p>}
      {resolvedId && loading && <p className="text-sm text-muted-foreground">加载中…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {resolvedId && !loading && !error && (
        <ul className="grid gap-3 md:grid-cols-2" role="list">
          {paged.map((p) => (
            <li key={p.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <a
                href={`/products/${p.id}`}
                className="block cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md -m-3 p-3"
              >
                <div className="font-medium text-foreground">{p.name}</div>
                {p.nameEn && (
                  <div className="text-xs text-muted-foreground">{p.nameEn}</div>
                )}
              </a>
            </li>
          ))}
          {paged.length === 0 && (
            <li className="text-sm text-muted-foreground">
              暂无商品。
            </li>
          )}
        </ul>
      )}

      {totalItems > 0 && (
        <nav className="flex items-center justify-center gap-4 text-xs" aria-label="分页">
          <button
            type="button"
            className="cursor-pointer rounded border border-border px-2 py-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="上一页"
          >
            上一页
          </button>
          <span className="text-muted-foreground" aria-live="polite">
            第 {page} / {totalPages} 页（共 {totalItems} 条）
          </span>
          <button
            type="button"
            className="cursor-pointer rounded border border-border px-2 py-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="下一页"
          >
            下一页
          </button>
        </nav>
      )}
    </section>
  );
}

