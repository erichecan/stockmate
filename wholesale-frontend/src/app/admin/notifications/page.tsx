// Updated: 2026-03-18T23:16:30 - 管理端通知中心接入真实通知 API
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authApi } from '@/lib/api';

type Notice = {
  id: string;
  type?: string;
  title?: string | null;
  body?: string | null;
  createdAt?: string;
  payload?: Record<string, unknown>;
};

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notice[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await authApi.get('/notifications/me', {
        params: { limit: 100, offset: 0 },
      });
      setNotifications(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        出库、审批、异常等业务通知统一查看。
      </p>
      <div className="mt-4">
        <Button variant="outline" onClick={load}>
          刷新
        </Button>
      </div>
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
              暂无通知
            </p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="rounded border px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{n.title || '系统通知'}</div>
                      <div className="text-sm text-muted-foreground">
                        {n.body || JSON.stringify(n.payload || {})}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleString()
                          : '时间未知'}
                      </div>
                    </div>
                    <Badge variant="outline">{n.type || 'EVENT'}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
