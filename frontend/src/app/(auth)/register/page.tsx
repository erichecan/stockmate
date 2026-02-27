// Updated: 2026-02-27T04:35:00
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTenantNameChange = useCallback(
    (value: string) => {
      setTenantName(value);
      if (!slugManuallyEdited) {
        setTenantSlug(generateSlug(value));
      }
    },
    [slugManuallyEdited],
  );

  const handleSlugChange = useCallback((value: string) => {
    setTenantSlug(value);
    setSlugManuallyEdited(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantName || !tenantSlug || !firstName || !lastName || !email || !password) {
      toast.error('请填写所有必填字段');
      return;
    }

    if (password.length < 8) {
      toast.error('密码至少需要 8 个字符');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        tenantName,
        tenantSlug,
      });
      toast.success('注册成功！');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || '注册失败，请稍后再试';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">创建账户</CardTitle>
        <CardDescription>
          注册 StockFlow 开始管理您的库存
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">公司名称</Label>
            <Input
              id="tenantName"
              type="text"
              placeholder="我的公司"
              value={tenantName}
              onChange={(e) => handleTenantNameChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenantSlug">公司标识</Label>
            <Input
              id="tenantSlug"
              type="text"
              placeholder="my-company"
              value={tenantSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              用于登录的唯一标识，仅支持小写字母、数字和连字符
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">名</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="明"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">姓</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="王"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
          </div>
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
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              至少 8 个字符，建议包含大小写字母、数字和特殊字符
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            创建账户
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            已有账户？{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              立即登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
