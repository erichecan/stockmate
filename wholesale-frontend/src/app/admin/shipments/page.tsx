// Updated: 2026-03-18T23:12:40 - 到柜预报看板页接入 forecast API
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';

type Shipment = {
  id: string;
  containerNo?: string | null;
  vesselName?: string | null;
  eta?: string | null;
  status: string;
  purchaseOrder?: { orderNumber?: string | null };
};

export default function AdminShipmentsPage() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/purchasing/shipments/forecast');
      setShipments(Array.isArray(data) ? data : []);
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shipments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        到柜预报（上船/海上/到港待提柜/到仓待卸柜/卸柜点收）
      </p>
      <div className="mt-4">
        <Button variant="outline" onClick={load}>
          刷新
        </Button>
      </div>
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
              暂无到柜预报数据
            </p>
          ) : (
            <ul className="space-y-2">
              {shipments.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/admin/shipments/${s.id}`}
                    className="flex items-center justify-between rounded border px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">
                        {s.containerNo || 'NO-CONTAINER'} · {s.vesselName || '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        PO: {s.purchaseOrder?.orderNumber || '-'} · ETA:{' '}
                        {s.eta ? new Date(s.eta).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <Badge variant="outline">{s.status}</Badge>
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
