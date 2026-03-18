// 2026-03-17T12:37:00 - Admin shipments list skeleton
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export default function AdminShipmentsPage() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<unknown[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/shipments').catch(() => ({ data: [] }));
        setShipments(Array.isArray(data) ? data : data?.data ?? []);
      } catch {
        setShipments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shipments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Container and shipment tracking (API: GET /admin/shipments)
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : shipments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No shipments (API not implemented or empty)
            </p>
          ) : (
            <ul className="space-y-2">
              {(shipments as { id?: string; containerNo?: string }[]).slice(0, 10).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/admin/shipments/${s.id}`}
                    className="flex items-center justify-between rounded border px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <span className="font-medium">{s.containerNo ?? s.id}</span>
                    <Badge variant="outline">View</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
