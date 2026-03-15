// Updated: 2026-03-14T18:30:00 - 批发站 P0: 注册占位页（暂未开放线上注册）
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">批发站注册</CardTitle>
        <CardDescription>
          当前暂未开放自助注册，如需开通批发账号，请联系管理员。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>请通过以下方式申请批发站账号：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>发送邮件给业务同学，说明公司名称与联系人信息；</li>
          <li>由内部在后台创建 Customer 与账号后，您将收到登录信息；</li>
          <li>收到账号后可直接使用「批发站登录」入口登录本系统。</li>
        </ul>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button asChild variant="outline">
          <Link href="/login">返回登录</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
