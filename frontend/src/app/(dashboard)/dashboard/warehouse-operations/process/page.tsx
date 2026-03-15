// 仓内作业 - 库存加工：占位页（功能开发中）
// Updated: 2026-03-14
'use client';

import { Cog } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ProcessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">库存加工</h1>
        <p className="text-muted-foreground">加工/组装：源 SKU 扣减、目标 SKU 增加。</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            功能开发中
          </CardTitle>
          <CardDescription>
            库存加工（源表 → 目标表、BOM 组装等）将在后续版本提供，请先使用库存调整与库存移动。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            参考 ModernWMS 的 warehouseProcessing 模块，后续将实现：创建加工单、选择源 SKU 与目标 SKU、数量关系与 Ledger 记录。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
