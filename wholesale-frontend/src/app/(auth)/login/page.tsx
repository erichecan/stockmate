// 2026-03-15 UI/UX Pro Max：登录页，显式背景/边框/对比度，避免“CSS 丢失”感
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const LAST_TENANT_KEY = 'lastTenantSlug';

const TEST_ACCOUNT = {
  email: 'admin@test.com',
  password: 'Test1234!',
  tenantSlug: 'test-company',
};

export default function LoginPage() {
  const router = useRouter();
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
      typeof window !== 'undefined' ? localStorage.getItem(LAST_TENANT_KEY) : null;
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
      toast.error('请输入邮箱和密码');
      return;
    }
    setIsSubmitting(true);
    setTenantOptions([]);
    try {
      // 2026-03-15 后端全局前缀为 api，登录接口为 /api/auth/wholesale/login
      const base =
        process.env.NEXT_PUBLIC_API_BASE_AUTH || 'http://localhost:3001/api';
      const res = await axios.post(`${base}/auth/wholesale/login`, {
        email,
        password,
        tenantSlug: tenantSlug.trim() || undefined,
      });
      const accessToken: string | undefined = res.data?.accessToken;
      if (accessToken && typeof window !== 'undefined') {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('wholesaleUser', JSON.stringify(res.data?.user ?? '{}'));
        if (tenantSlug.trim()) {
          localStorage.setItem(LAST_TENANT_KEY, tenantSlug.trim());
        }
      }
      toast.success('登录成功');
      // 立即跳转首页，用 setTimeout 确保在 React 更新后执行，避免被阻塞
      setTimeout(() => {
        window.location.replace('/');
      }, 0);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; detail?: string } } })
        ?.response?.data;
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
            toast.error('请选择您要登录的公司');
            return;
          }
        } catch {
          /* ignore */
        }
      }
      toast.error(detail || message || '登录失败，请检查邮箱和密码');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    'h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
  const btnGhost =
    'cursor-pointer rounded-lg transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  return (
    <div
      className="rounded-2xl border border-border bg-card px-6 py-8 shadow-lg shadow-black/5"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          登录
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          使用邮箱与密码登录，查看批发价与下单
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 测试账号：Pro Max 可见边框与背景 */}
        <div
          className="overflow-hidden rounded-xl border border-border bg-muted/50"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
        >
          <button
            type="button"
            onClick={() => setShowTestHint(!showTestHint)}
            aria-expanded={showTestHint}
            aria-label={
              showTestHint ? '收起测试账号说明' : '展开测试账号说明'
            }
            className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm ${btnGhost}`}
          >
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">测试 / 演示账号</span>
            {showTestHint ? (
              <ChevronUp className="ml-auto h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
            )}
          </button>
          {showTestHint && (
            <div
              className="border-t border-border px-4 pb-4 pt-2 text-xs text-muted-foreground"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="mb-2">
                邮箱{' '}
                <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
                  {TEST_ACCOUNT.email}
                </kbd>
                ，密码{' '}
                <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
                  {TEST_ACCOUNT.password}
                </kbd>
                ，公司标识可选{' '}
                <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">
                  {TEST_ACCOUNT.tenantSlug}
                </kbd>
                。
              </p>
              <p className="mb-3 text-[11px]">
                若提示「No customer bound」需在后台为该用户绑定客户。
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 cursor-pointer text-xs transition-colors duration-200"
                onClick={fillTestAccount}
              >
                一键填入
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="login-email"
            className="text-sm font-medium text-foreground"
          >
            邮箱
          </Label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="login-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={`${inputBase} pl-10`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="login-password"
            className="text-sm font-medium text-foreground"
          >
            密码
          </Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={`${inputBase} pl-10`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowCompany(!showCompany)}
            aria-expanded={showCompany}
            aria-label={showCompany ? '收起公司标识' : '展开公司标识'}
            className={`flex items-center gap-2 text-sm ${btnGhost} py-2`}
          >
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {showCompany ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="text-muted-foreground">使用其他公司登录</span>
          </button>
          {showCompany && (
            <div
              className="rounded-xl border border-border bg-muted/30 p-4"
              role="region"
              aria-label="公司标识"
              style={{ borderColor: 'var(--border)' }}
            >
              <Label
                htmlFor="login-tenant"
                className="text-sm font-medium text-foreground"
              >
                公司标识
              </Label>
              {tenantOptions.length > 0 ? (
                <select
                  id="login-tenant"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  required
                  className={`mt-2 ${inputBase} cursor-pointer`}
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
                  id="login-tenant"
                  type="text"
                  placeholder="your-company"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  autoComplete="organization"
                  className={`mt-2 ${inputBase}`}
                />
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-2">
          <Button
            type="submit"
            className="h-11 w-full cursor-pointer font-medium transition-colors duration-200 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            登录
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            还没有账户？{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              立即注册
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
