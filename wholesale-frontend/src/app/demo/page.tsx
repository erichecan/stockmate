'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Gauge,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type DemoStep = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  pain: string;
  solution: string;
  impact: string;
  speakerNotes: string[];
};

const STEP_SECONDS = 90;

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'pain-overview',
    title: '第一部分：每天漏钱与白费力',
    subtitle: '先让观众认同问题是真的、痛是持续的',
    route: '/admin',
    pain:
      '下单流失、盯屏接单、仓库重复跑腿、把海上货当现货卖，正在持续吞噬利润与口碑。',
    solution:
      '用系统贯穿下单、库存、履约、经营数据，切掉人工断点，避免每个环节各自为战。',
    impact:
      '演示开场 90 秒让听众达成共识：不是生意差，而是流程在漏钱。',
    speakerNotes: [
      '我们不是缺人干活，而是流程让人一直在救火。',
      '今天演示的重点是“从接单到发货到复盘，一条线跑通”。',
      '后面每一步都对应一个真实页面，不是 PPT 口号。',
    ],
  },
  {
    id: 'fast-ordering',
    title: '第二部分：极速点单，堵住前端流失',
    subtitle: '30 秒批量下单 + 跨端续单',
    route: '/bulk-order',
    pain:
      '客户像逛零售站一样慢慢点，选到一半被打断就流失，购物车和草稿也容易断。',
    solution:
      '用矩阵式批量录单减少点击成本，草稿放服务端，电脑没下完手机继续下。',
    impact:
      '客户下单速度与完成率提升，订单不再“飞单”，业务可在任意终端接力。',
    speakerNotes: [
      '你可以强调“输入 SKU + 数量 + 回车”的节奏感。',
      '演示时快速录几行，突出“不是点详情页”的效率差。',
      '收尾一句：单子跟着客户走，而不是跟着某台电脑走。',
    ],
  },
  {
    id: 'inventory-clarity',
    title: '第三部分：穿透货柜迷雾，绝不卖错货',
    subtitle: '在途/到港/现货三段式库存视图',
    route: '/admin/shipments',
    pain:
      '销售和仓库看的是不同真相，常把在途货当现货，导致卖了发不出。',
    solution:
      '货柜生命周期可视化，预售与现货明确分层；未上架只走预售路径，不占现货承诺。',
    impact:
      '减少错卖与爽约，保护商誉，同时让财务与销售对库存口径一致。',
    speakerNotes: [
      '这里重点讲“状态清楚就能定价清楚、承诺清楚”。',
      '可以示意：在途收定金，到货再转实发。',
      '强调系统是防错机制，不靠人脑记忆。',
    ],
  },
  {
    id: 'wave-operations',
    title: '第四部分：机器合单，仓库按库位扫街',
    subtitle: '波次任务把重复跑腿变成一次性作业',
    route: '/admin/orders',
    pain:
      '订单一张张打印、仓库一单单拣，爆品库位被反复往返，纯体力内耗。',
    solution:
      '系统自动聚合订单成波次任务，按库位给指令，一次取货再分配到订单框。',
    impact:
      '显著减少无效步行与漏拣错拣，3 个人可覆盖过去 9 人的重复工作。',
    speakerNotes: [
      '这里建议现场点一次“生成拣货单（波次）”。',
      '你可以强调“不是按订单走，是按库位走”。',
      '顺带展示打印拣货单里的 Bin 与 Qty 语义已正确。',
    ],
  },
  {
    id: 'boss-console',
    title: '第五部分：老板移动数字茶桌',
    subtitle: '白天跑系统，晚上看结果',
    route: '/admin',
    pain:
      '老板离开仓库就失去实时掌控，很多问题要靠第二天复盘才知道。',
    solution:
      '关键经营指标集中在管理看板，预售、现货、履约、通知统一口径输出。',
    impact:
      '老板从“盯流程”转向“定规则 + 看结果”，企业进入系统驱动运营。',
    speakerNotes: [
      '收尾要讲“你不用在每个环节都亲自盯人”。',
      '建议把今天演示映射回三条线：收入、效率、风险。',
      '最后给出一句承诺：生意由系统跑，你只负责掌舵。',
    ],
  },
];

export default function DemoShowcasePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [remainSeconds, setRemainSeconds] = useState(STEP_SECONDS);
  const [frameKey, setFrameKey] = useState(0);

  const activeStep = DEMO_STEPS[activeIndex];

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

  useEffect(() => {
    setRemainSeconds(STEP_SECONDS);
  }, [activeIndex, autoPlay]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => {
      setRemainSeconds((prev) => {
        if (prev > 1) return prev - 1;
        setActiveIndex((current) => (current + 1) % DEMO_STEPS.length);
        return STEP_SECONDS;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  const progressPercent = useMemo(
    () => ((activeIndex + 1) / DEMO_STEPS.length) * 100,
    [activeIndex],
  );
  // Updated: 2026-03-19T12:18:40 - 第一部分右侧演示区切换为 introduce.pdf 同款浅灰+蓝色强调
  const isPainOverviewStep = activeStep.id === 'pain-overview';

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

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">系统演示驾驶舱</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            演示账号专用：左侧讲价值，右侧现场操作真实功能页
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            步骤 {activeIndex + 1}/{DEMO_STEPS.length}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPlay((v) => !v)}
          >
            {autoPlay ? (
              <>
                <PauseCircle className="mr-1 h-4 w-4" />
                暂停自动播放（{remainSeconds}s）
              </>
            ) : (
              <>
                <PlayCircle className="mr-1 h-4 w-4" />
                开启自动播放
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFrameKey((k) => k + 1)}
          >
            <Gauge className="mr-1 h-4 w-4" />
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
            <CardTitle className="text-base">演示主线</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {DEMO_STEPS.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    activeIndex === index
                      ? 'border-primary/40 bg-primary/5'
                      : 'hover:bg-accent/60'
                  }`}
                >
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {step.subtitle}
                  </p>
                </button>
              ))}
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">核心痛点</p>
              <p className="mt-1 text-muted-foreground">{activeStep.pain}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">系统打法</p>
              <p className="mt-1 text-muted-foreground">{activeStep.solution}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">业务结果</p>
              <p className="mt-1 text-muted-foreground">{activeStep.impact}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">讲解提示词</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {activeStep.speakerNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setActiveIndex((v) => (v - 1 + DEMO_STEPS.length) % DEMO_STEPS.length)
                }
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                上一步
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveIndex((v) => (v + 1) % DEMO_STEPS.length)}
              >
                下一步
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`overflow-hidden ${isPainOverviewStep ? 'border-[#dce1e8] bg-[#f5f6f8]' : ''}`}
        >
          <CardHeader
            className={`py-3 ${
              isPainOverviewStep
                ? 'border-b-4 border-b-[#0062b0] bg-[#f5f6f8]'
                : 'border-b bg-muted/20'
            }`}
          >
            <CardTitle className="text-sm font-medium text-muted-foreground">
              演示窗口 · {activeStep.route}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Updated: 2026-03-19T12:06:08 - 特殊 iframe 演示框：右侧承载真实功能页面 */}
            <iframe
              key={`${activeStep.id}-${frameKey}`}
              src={activeStep.route}
              title={`Demo ${activeStep.title}`}
              className={`h-[75vh] w-full border-0 ${
                isPainOverviewStep ? 'bg-[#f5f6f8]' : 'bg-background'
              }`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
