// 2026-03-16T23:12:00 - B2B Professional login page for European wholesale market
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  Lock,
  Building2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const LAST_TENANT_KEY = 'lastTenantSlug';

// Updated: 2026-03-17T00:10:00 - P0 闭环: 使用真实测试账号
const TEST_ACCOUNT = {
  email: 'admin@test.com',
  password: 'Test1234!',
  tenantSlug: 'test-company',
};
const DEMO_ROUTE = '/demo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [showCompany, setShowCompany] = useState(false);
  const [showTestHint, setShowTestHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<
    { slug: string; name: string }[]
  >([]);

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? localStorage.getItem(LAST_TENANT_KEY)
        : null;
    if (saved) setTenantSlug(saved);
  }, []);

  const fillTestAccount = () => {
    setEmail(TEST_ACCOUNT.email);
    setPassword(TEST_ACCOUNT.password);
    setTenantSlug(TEST_ACCOUNT.tenantSlug);
    setShowTestHint(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setIsSubmitting(true);
    setTenantOptions([]);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_AUTH || 'http://localhost:3001/api';
      const res = await axios.post(`${base}/auth/wholesale/login`, {
        email,
        password,
        tenantSlug: tenantSlug.trim() || undefined,
      });
      // Updated: 2026-03-17T00:11:00 - P0 闭环: 存储 access + refresh token
      const { accessToken, refreshToken, user } = res.data ?? {};
      if (accessToken && typeof window !== 'undefined') {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        if (user?.id) localStorage.setItem('userId', user.id);
        localStorage.setItem('wholesaleUser', JSON.stringify(user ?? '{}'));
        const slugToSave = tenantSlug.trim() || user?.tenantSlug;
        if (slugToSave) localStorage.setItem(LAST_TENANT_KEY, slugToSave);
      }
      toast.success('Login successful');
      // Updated: 2026-03-19T12:06:48 - 演示账号登录后默认进入演示驾驶舱
      const isDemoLogin =
        email.trim().toLowerCase() === TEST_ACCOUNT.email &&
        (tenantSlug.trim() || user?.tenantSlug) === TEST_ACCOUNT.tenantSlug;
      setTimeout(() => {
        window.location.replace(isDemoLogin ? DEMO_ROUTE : '/');
      }, 0);
    } catch (err: unknown) {
      const res = (
        err as {
          response?: { data?: { message?: string; detail?: string } };
        }
      )?.response?.data;
      const message = res?.message;
      const detail = res?.detail;
      if (message) {
        try {
          const parsed = JSON.parse(message);
          if (
            parsed.code === 'MULTIPLE_TENANTS' &&
            Array.isArray(parsed.tenants)
          ) {
            setTenantOptions(parsed.tenants);
            setShowCompany(true);
            toast.error('Please select your company');
            return;
          }
        } catch {
          /* not JSON */
        }
      }
      toast.error(detail || message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Sign In
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your wholesale account to view pricing and place orders
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Test account hint */}
          <div className="overflow-hidden rounded-xl border border-border bg-muted/50">
            <button
              type="button"
              onClick={() => setShowTestHint(!showTestHint)}
              aria-expanded={showTestHint}
              aria-label={
                showTestHint ? 'Collapse demo info' : 'Expand demo info'
              }
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors duration-200 hover:bg-accent"
            >
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Demo Account</span>
              {showTestHint ? (
                <ChevronUp className="ml-auto h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
              )}
            </button>
            {showTestHint && (
              <div className="border-t border-border px-4 pb-4 pt-3 text-xs text-muted-foreground">
                <p className="mb-2">
                  Email:{' '}
                  <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
                    {TEST_ACCOUNT.email}
                  </kbd>{' '}
                  Password:{' '}
                  <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
                    {TEST_ACCOUNT.password}
                  </kbd>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={fillTestAccount}
                >
                  Auto-fill
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 pl-10"
              />
            </div>
          </div>

          {/* Company selector */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCompany(!showCompany)}
              aria-expanded={showCompany}
              className="flex items-center gap-2 rounded-lg py-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              <span>Company ID (optional)</span>
              {showCompany ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showCompany && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <Label htmlFor="login-tenant">Company Identifier</Label>
                {tenantOptions.length > 0 ? (
                  <select
                    id="login-tenant"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    required
                    className="mt-2 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select company</option>
                    {tenantOptions.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="login-tenant"
                    type="text"
                    placeholder="your-company"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    autoComplete="organization"
                    className="mt-2 h-11"
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <Button
              type="submit"
              className="h-11 w-full font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
