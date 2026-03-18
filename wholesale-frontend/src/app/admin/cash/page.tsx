// 2026-03-17T12:37:45 - Admin cash / finance skeleton
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function AdminCashPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/cash').catch(() => ({ data: null }));
        setSummary(data ?? null);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cash & Finance</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cash flow and financial overview (API: GET /admin/cash)
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
            </div>
          ) : summary ? (
            <pre className="overflow-auto rounded bg-muted p-4 text-xs">
              {JSON.stringify(summary, null, 2)}
            </pre>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No data (API not implemented)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
