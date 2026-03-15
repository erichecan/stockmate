// 仓内作业 - 盘点：占位页（功能开发中）
// Updated: 2026-03-14
'use client';

import { ClipboardCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function StocktakingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">盘点</h1>
        <p className="text-muted-foreground">盘点任务生成、实盘录入、差异确认与调整。</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            功能开发中
          </CardTitle>
          <CardDescription>
            盘点（按仓库/货位或 SKU 快照、录入实盘、确认后写调整）将在后续版本提供，请先使用库存调整进行盘盈盘亏处理。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            参考 ModernWMS 的 warehouseTaking 模块，后续将实现：创建盘点任务、录入实盘数量、确认后自动生成调整单并写入台账。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
