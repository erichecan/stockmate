// 2026-03-17T12:37:15 - Admin shipment detail skeleton
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function AdminShipmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [shipment, setShipment] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/admin/shipments/${id}`).catch(() => ({ data: null }));
        setShipment(data ?? null);
      } catch {
        setShipment(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="p-6">
      <Link
        href="/admin/shipments"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shipments
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        Shipment {id.slice(0, 8)}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Detail view (API: GET /admin/shipments/:id)
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded bg-muted" />
            </div>
          ) : shipment ? (
            <pre className="overflow-auto rounded bg-muted p-4 text-xs">
              {JSON.stringify(shipment, null, 2)}
            </pre>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Shipment not found (API not implemented)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
