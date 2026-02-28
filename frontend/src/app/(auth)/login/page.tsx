// 简化登录：默认只需邮箱+密码，公司标识可选并记住
// Updated: 2026-02-28T15:00:00
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const LAST_TENANT_KEY = 'lastTenantSlug';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [showCompany, setShowCompany] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LAST_TENANT_KEY) : null;
    if (saved) setTenantSlug(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('请输入邮箱和密码');
      return;
    }

    setIsSubmitting(true);
    setTenantOptions([]);
    try {
      await login(email, password, tenantSlug.trim() || undefined);
      toast.success('登录成功');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const message = res?.message;

      if (message) {
        try {
          const parsed = JSON.parse(message);
          if (parsed.code === 'MULTIPLE_TENANTS' && Array.isArray(parsed.tenants)) {
            setTenantOptions(parsed.tenants);
            setShowCompany(true);
            toast.error('请选择您要登录的公司');
            return;
          }
        } catch {
          /* ignore parse error */
        }
      }
      toast.error(message || '登录失败，请检查邮箱和密码');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">登录</CardTitle>
        <CardDescription>输入邮箱和密码即可登录</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {/* 公司标识：默认收起，多租户或需要时展开 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCompany(!showCompany)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {showCompany ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              使用其他公司登录
            </button>
            {showCompany && (
              <div className="space-y-2 rounded-lg border p-3">
                <Label htmlFor="tenantSlug">公司标识</Label>
                {tenantOptions.length > 0 ? (
                  <select
                    id="tenantSlug"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">请选择公司</option>
                    {tenantOptions.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="tenantSlug"
                    type="text"
                    placeholder="your-company"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    autoComplete="organization"
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            还没有账户？{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              立即注册
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
