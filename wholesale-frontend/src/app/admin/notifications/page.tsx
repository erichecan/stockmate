// 2026-03-17T12:37:30 - Admin notifications skeleton
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<unknown[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/admin/notifications').catch(() => ({ data: [] }));
        setNotifications(Array.isArray(data) ? data : data?.data ?? []);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        System notifications and alerts (API: GET /admin/notifications)
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications (API not implemented or empty)
            </p>
          ) : (
            <ul className="space-y-2">
              {(notifications as { id?: string }[]).slice(0, 10).map((n) => (
                <li key={n.id} className="rounded border px-3 py-2">
                  Notification {n.id}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
