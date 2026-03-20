// Updated: 2026-03-20T07:20:45-0400 - 合并至仓库拣货看板，本页仅保留重定向
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectToWarehousePicking() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/admin/warehouse-waves${q ? `?${q}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="p-6 text-sm text-muted-foreground">正在跳转到仓库拣货看板…</div>
  );
}

export default function AdminWavesRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">正在跳转…</div>
      }
    >
      <RedirectToWarehousePicking />
    </Suspense>
  );
}
