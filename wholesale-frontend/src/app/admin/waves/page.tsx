// 2026-03-17T12:36:45 - Admin waves skeleton
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function AdminWavesPage() {
  const [loading, setLoading] = useState(true);
  const [waves, setWaves] = useState<unknown[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/waves').catch(() => ({ data: [] }));
        setWaves(Array.isArray(data) ? data : data?.data ?? []);
      } catch {
        setWaves([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pick Waves</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick wave management (API: GET /admin/waves)
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Waves</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : waves.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No waves (API not implemented or empty)
            </p>
          ) : (
            <ul className="space-y-2">
              {(waves as { id?: string }[]).slice(0, 10).map((w) => (
                <li key={w.id} className="rounded border px-3 py-2">
                  Wave {w.id}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
