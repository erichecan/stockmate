'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DemoStep = {
  id: string;
  title: string;
  route: string;
  why: string;
};

type RoleShowcase = {
  role: string;
  title: string;
  summary: string;
  kpis: string[];
  steps: DemoStep[];
};

const DEMO_STEP_MEMORY_KEY = 'demoRoleStepMemory';

// Updated: 2026-03-20T15:48:00 - 按角色拆分 Demo；已移除与老板重复的经理（OPERATIONS）演示线
// Updated: 2026-03-20T18:23:40 - 网站管理步骤置顶商品管理
// Updated: 2026-03-20T19:05:20 - 移除责任矩阵演示步骤
// Updated: 2026-03-20T19:35:22 - 演示卡片不再 overflow-hidden，避免 iframe 内文档已有滚动条时观感被裁切
const DEMO_SHOWCASES: RoleShowcase[] = [
  {
    role: 'ADMIN',
    title: '老板视角',
    summary: '看总体经营、货柜进度、团队执行结果，不陷入微观操作。',
    kpis: ['订单总量与波次效率', '到柜预报与到仓状态', '现金/通知异常闭环'],
    steps: [
      { id: 'boss-dashboard', title: '经营总览', route: '/admin', why: '先看全局指标和风险热度。' },
      { id: 'boss-shipments', title: '货柜进度', route: '/admin/shipments', why: '确认在途、到港、待卸柜。' },
      // Updated: 2026-03-20T12:17:10 - 员工执行结果 → /admin/staff，现金与对账 → /admin/cash
      { id: 'boss-waves', title: '员工执行结果', route: '/admin/staff', why: '看出勤、打卡、拣货进度、订单处理。' },
      { id: 'boss-cash', title: '现金与对账', route: '/admin/cash', why: '查看今日订单、收款结构与未付零售商。' },
    ],
  },
  {
    role: 'WAREHOUSE',
    title: '仓库主管视角',
    summary: '关注仓内执行：波次、库位路径、缺货与到货。',
    kpis: ['待处理订单数', '待处理波次数', '缺货项数量', '货柜到仓节奏'],
    steps: [
      {
        id: 'warehouse-picking-board',
        title: '仓库拣货看板',
        route: '/admin/warehouse-waves',
        why: '创建波次、查看拣货单、推进状态与缺货一览。',
      },
      { id: 'warehouse-shipments', title: '到柜预报', route: '/admin/shipments', why: '提前安排卸柜和库位。' },
    ],
  },
  {
    role: 'SALES_SUPERVISOR',
    title: '批发网站主管视角',
    summary: '管理价格策略、起订量与预售限购，平衡利润与转化。',
    kpis: ['等级折扣策略', 'MOQ 执行', '预售限购策略'],
    steps: [
      { id: 'ws-pricing', title: '等级折扣', route: '/admin/pricing', why: '按客户等级控制利润边界。' },
      { id: 'ws-moq', title: 'MOQ 批量策略', route: '/admin/moq', why: '压住低质量小单。' },
      { id: 'ws-preorder-limits', title: '预售限购', route: '/admin/preorder-limits', why: '防止热门品被单一客户抢空。' },
    ],
  },
  {
    role: 'SALES',
    title: '订单处理视角',
    summary: '快速接单、合并波次、交接仓库执行。',
    kpis: ['订单待处理量', '波次创建效率', '拣货单可执行度'],
    steps: [
      {
        id: 'order-orders',
        title: '订单管理',
        route: '/admin/orders',
        why: '待处理/未支付看板、勾选生成波次与打印拣货单（与仓库拣货看板联动）。',
      },
    ],
  },
  {
    role: 'RETURN_SPECIALIST',
    title: '退货专员视角',
    summary: '每天匹配“哪个订单退回了什么”，并做处置决策。',
    kpis: ['退回件匹配率', '决策处理时效', '可回收价值占比'],
    steps: [
      {
        id: 'returns-workbench',
        title: '退货工作台',
        route: '/admin/returns',
        why: '登记/匹配、列表选中后查看原单与提交处置决策，同一页面完成。',
      },
    ],
  },
  {
    role: 'PICKER',
    title: '仓库拣货员视角',
    summary: '只看执行：拿任务、按库位拣货、反馈缺货。',
    kpis: ['波次完成数', '缺货反馈及时率', '拣货路径执行一致性'],
    steps: [
      { id: 'picker-board', title: '领取任务', route: '/admin/warehouse-waves', why: '从待处理波次开始拣货。' },
      { id: 'picker-list', title: '执行拣货单', route: '/admin/warehouse-waves', why: '按库位顺序走，减少无效往返。' },
    ],
  },
  {
    role: 'RETAIL_BUYER',
    title: '零售商采购视角',
    summary:
      '登录后专注「快、准、省时间」的采购动线：再来一单、批量录入、特价与预售。',
    kpis: ['30 秒下单动线', '价格与库存一眼可见', '信用与订单状态前置'],
    steps: [
      { id: 'rb-home', title: '采购大盘', route: '/', why: '顶部信用/待办 + 四大快捷入口。' },
      { id: 'rb-bulk', title: '批量下单', route: '/bulk-order', why: 'SKU+数量矩阵，适合熟客快速补货。' },
      { id: 'rb-deals', title: '特价/清仓', route: '/deals', why: '高周转或清仓品集中曝光。' },
    ],
  },
  {
    role: 'CATALOG_ADMIN',
    title: '网站管理视角',
    summary:
      '维护商品主数据、图片、基础价、MOQ 与预售限购；与主管/运营/财务分工核查。',
    kpis: ['主数据准确率', '改价可追溯', '限购与货柜计划一致'],
    steps: [
      { id: 'cg-products', title: '商品与主图', route: '/admin/products', why: '日常维护名称、英文名与图片 URL 顺序。' },
      { id: 'cg-pricing', title: '等级折扣', route: '/admin/pricing', why: '价格策略与等级折扣配置。' },
      { id: 'cg-moq', title: 'MOQ 批量', route: '/admin/moq', why: '批量维护起订量。' },
    ],
  },
];

export default function DemoShowcasePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore();
  const [frameKey, setFrameKey] = useState(0);
  const [forcedRole, setForcedRole] = useState<string>('');
  // Updated: 2026-03-19T16:09:33 - 角色步骤记忆持久化到 localStorage（刷新后保留）
  const [roleStepMemory, setRoleStepMemory] = useState<Record<string, number>>(
    () => {
      if (typeof window === 'undefined') return {};
      try {
        const raw = localStorage.getItem(DEMO_STEP_MEMORY_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, number>;
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    },
  );

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      // Updated: 2026-03-19T12:06:08 - 未登录用户访问演示驾驶舱时回到登录页
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const currentRole = forcedRole || user?.role || 'ADMIN';
  const showcase = useMemo(() => {
    return (
      DEMO_SHOWCASES.find((item) => item.role === currentRole) ||
      DEMO_SHOWCASES.find((item) => item.role === 'ADMIN')!
    );
  }, [currentRole]);

  const currentRoleIndex = roleStepMemory[currentRole] ?? 0;
  const safeIndex = currentRoleIndex < showcase.steps.length ? currentRoleIndex : 0;
  const activeStep = showcase.steps[safeIndex] || showcase.steps[0];
  const progressPercent = useMemo(() => {
    if (!showcase.steps.length) return 0;
    return ((safeIndex + 1) / showcase.steps.length) * 100;
  }, [safeIndex, showcase.steps.length]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            正在校验登录状态...
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateRoleStepMemory = (
    updater: (prev: Record<string, number>) => Record<string, number>,
  ) => {
    setRoleStepMemory((prev) => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEMO_STEP_MEMORY_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  // Updated: 2026-03-19T15:55:14 - 右上角角色切换：切换时重置步骤并刷新演示 iframe
  const handleRoleChange = (value: string) => {
    updateRoleStepMemory((prev) => ({ ...prev, [currentRole]: safeIndex }));
    setForcedRole(value === '__follow__' ? '' : value);
    setFrameKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">角色化演示驾驶舱</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            同一套系统，不同角色登录后只看最关键演示内容
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[220px]">
            <Select
              value={forcedRole || '__follow__'}
              onValueChange={handleRoleChange}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="切换角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__follow__">跟随当前登录角色</SelectItem>
                {DEMO_SHOWCASES.map((item) => (
                  <SelectItem key={item.role} value={item.role}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary">
            {showcase.title} · 步骤 {safeIndex + 1}/{showcase.steps.length}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFrameKey((k) => k + 1)}
          >
            <Filter className="mr-1 h-4 w-4" />
            刷新演示窗口
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(activeStep.route, '_blank')}
          >
            <ExternalLink className="mr-1 h-4 w-4" />
            新窗口打开当前步骤
          </Button>
        </div>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">角色主线</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">{showcase.title}</p>
              <p className="mt-1 text-muted-foreground">{showcase.summary}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">关键结果指标</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {showcase.kpis.map((kpi) => (
                  <li key={kpi}>{kpi}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              {showcase.steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    // Updated: 2026-03-19T16:09:33 - 点击步骤时同步持久化当前角色进度
                    updateRoleStepMemory((prev) => ({
                      ...prev,
                      [currentRole]: index,
                    }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    safeIndex === index
                      ? 'border-primary/40 bg-primary/5'
                      : 'hover:bg-accent/60'
                  }`}
                >
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.why}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="border-b bg-muted/20 py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              演示窗口 · {activeStep.route}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Updated: 2026-03-19T15:30:34 - 角色化演示窗口：按当前步骤加载真实业务页 */}
            <iframe
              key={`${activeStep.id}-${frameKey}`}
              src={activeStep.route}
              title={`Demo ${activeStep.title}`}
              className="h-[75vh] w-full border-0 bg-background"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
