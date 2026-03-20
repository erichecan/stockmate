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

// Updated: 2026-03-20T15:48:00 - 多角色 Demo（已去掉与老板重复的经理视角）对应 seed-demo-users.ts
// Updated: 2026-03-20T16:45:00 - 零售商采购 RETAIL_BUYER、网站管理 CATALOG_ADMIN（PRD A/B 端）
const DEMO_ACCOUNTS = [
  { key: 'boss', label: '老板视角', email: 'boss.demo@test.com', role: 'ADMIN' },
  { key: 'warehouse-supervisor', label: '仓库主管视角', email: 'warehouse.supervisor.demo@test.com', role: 'WAREHOUSE' },
  { key: 'wholesale-supervisor', label: '批发网站主管视角', email: 'wholesale.supervisor.demo@test.com', role: 'SALES_SUPERVISOR' },
  { key: 'order-processor', label: '订单处理视角', email: 'order.processor.demo@test.com', role: 'SALES' },
  { key: 'returns-specialist', label: '退货专员视角', email: 'returns.specialist.demo@test.com', role: 'RETURN_SPECIALIST' },
  { key: 'picker', label: '仓库拣货员视角', email: 'picker.demo@test.com', role: 'PICKER' },
  {
    key: 'retail-buyer',
    label: '零售商采购视角',
    email: 'retail.buyer.demo@test.com',
    role: 'RETAIL_BUYER',
  },
  {
    key: 'catalog-admin',
    label: '网站管理视角',
    email: 'catalog.admin.demo@test.com',
    role: 'CATALOG_ADMIN',
  },
] as const;
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_TENANT = 'test-company';
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
  // Updated: 2026-03-19T15:47:21 - Demo 角色选择器默认选中第一个角色
  const [selectedDemoEmail, setSelectedDemoEmail] = useState<string>(
    DEMO_ACCOUNTS[0]?.email ?? '',
  );

  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? localStorage.getItem(LAST_TENANT_KEY)
        : null;
    if (saved) setTenantSlug(saved);
  }, []);

  const fillDemoAccount = (emailValue: string) => {
    setEmail(emailValue);
    setPassword(DEMO_PASSWORD);
    setTenantSlug(DEMO_TENANT);
  };

  // Updated: 2026-03-19T15:47:21 - 抽离登录请求，支持“表单提交”和“角色一键登录”复用
  const loginWithCredentials = async (payload: {
    email: string;
    password: string;
    tenantSlug?: string;
  }) => {
    if (!payload.email || !payload.password) {
      toast.error('Please enter your email and password');
      return;
    }
    setIsSubmitting(true);
    setTenantOptions([]);
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_AUTH || 'http://localhost:3001/api';
      const res = await axios.post(`${base}/auth/wholesale/login`, {
        email: payload.email,
        password: payload.password,
        tenantSlug: payload.tenantSlug?.trim() || undefined,
      });
      // Updated: 2026-03-17T00:11:00 - P0 闭环: 存储 access + refresh token
      const { accessToken, refreshToken, user } = res.data ?? {};
      if (accessToken && typeof window !== 'undefined') {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        if (user?.id) localStorage.setItem('userId', user.id);
        localStorage.setItem('wholesaleUser', JSON.stringify(user ?? '{}'));
        const slugToSave = payload.tenantSlug?.trim() || user?.tenantSlug;
        if (slugToSave) localStorage.setItem(LAST_TENANT_KEY, slugToSave);
      }
      toast.success('Login successful');
      // Updated: 2026-03-19T12:06:48 - 演示账号登录后默认进入演示驾驶舱
      // Updated: 2026-03-20T18:23:20 - 零售商进采购首页；CATALOG_ADMIN 演示账号进商品管理
      const demoAccount = DEMO_ACCOUNTS.find(
        (item) => item.email === payload.email.trim().toLowerCase(),
      );
      const isDemoLogin =
        !!demoAccount &&
        (payload.tenantSlug?.trim() || user?.tenantSlug) === DEMO_TENANT;
      const demoRoute =
        demoAccount?.role === 'RETAIL_BUYER'
          ? '/'
          :         demoAccount?.role === 'CATALOG_ADMIN'
            ? '/admin/products'
            : DEMO_ROUTE;
      setTimeout(() => {
        window.location.replace(isDemoLogin ? demoRoute : '/');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginWithCredentials({ email, password, tenantSlug });
  };

  // Updated: 2026-03-19T15:47:21 - 角色一键登录：选中角色后自动填充并直接登录
  const handleQuickDemoLogin = async () => {
    if (!selectedDemoEmail) {
      toast.error('Please select a demo role');
      return;
    }
    fillDemoAccount(selectedDemoEmail);
    await loginWithCredentials({
      email: selectedDemoEmail,
      password: DEMO_PASSWORD,
      tenantSlug: DEMO_TENANT,
    });
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
                <p className="mb-2 text-[11px] leading-5">
                  Tenant: <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">{DEMO_TENANT}</kbd>{' '}
                  Password:{' '}
                  <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">{DEMO_PASSWORD}</kbd>
                </p>
                <div className="grid gap-2">
                  <select
                    value={selectedDemoEmail}
                    onChange={(e) => {
                      setSelectedDemoEmail(e.target.value);
                      fillDemoAccount(e.target.value);
                    }}
                    // Updated: 2026-03-20T10:27:35 - 修复下拉框被长文本撑出容器的问题
                    className="h-9 w-full min-w-0 rounded border border-input bg-background px-2 text-[12px] text-foreground"
                  >
                    {DEMO_ACCOUNTS.map((item) => (
                      <option key={item.key} value={item.email}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    当前账号：{selectedDemoEmail}
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={handleQuickDemoLogin}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '登录中...' : '所选角色一键登录'}
                  </Button>
                </div>
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
