// Updated: 2026-03-14T22:50:00 - 批发站首页：完全参考 1688 手机配件市场 https://3c.1688.com/shouji，含抓取图片
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import api from '@/lib/api';

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

type Product = {
  id: string;
  name: string;
  nameEn?: string | null;
};

// 本地 1688 抓取图片（public/1688）
const LOCAL_IMGS = [
  '/1688/2986325_1990471759.jpg',
  '/1688/3705765_1990471759.jpg',
  '/1688/3023004_1990471759.jpg',
  '/1688/3714810_1990471759.jpg',
  '/1688/3701817_1990471759.jpg',
  '/1688/3709761_1990471759.jpg',
  '/1688/3017006_1990471759.jpg',
  '/1688/3022009_1990471759.jpg',
  '/1688/3557598070_1867383390.180x180.jpg',
  '/1688/4113911577_27422975.180x180.jpg',
  '/1688/10204771242_806160092.180x180.jpg',
  '/1688/10246080472_750111620.200x200.jpg',
  '/1688/10052017610_982039426.110x110.jpg',
];

// 参考 1688 的静态文案与结构
const MARKETS = [
  { name: '手机市场', href: '/' },
  { name: '数码市场', href: '/categories' },
  { name: '微供市场', href: '/categories' },
  { name: '代销市场', href: '/categories' },
  { name: '外贸市场', href: '/categories' },
  { name: '地摊市场', href: '/categories' },
  { name: '手机维修市场', href: '/categories' },
  { name: '手机配件市场', href: '/categories' },
];

const CATEGORY_GROUPS = [
  {
    title: '手机',
    links: [
      { name: '智能手机', href: '/categories' },
      { name: '非智能机', href: '/categories' },
      { name: '三防手机', href: '/categories' },
      { name: '老人手机', href: '/categories' },
      { name: '儿童手机', href: '/categories' },
      { name: '低价手机', href: '/categories' },
    ],
  },
  {
    title: '手机配件',
    links: [
      { name: '手机壳', href: '/categories' },
      { name: '钢化膜', href: '/categories' },
      { name: '数据线', href: '/categories' },
      { name: '手机支架', href: '/categories' },
      { name: '蓝牙耳机', href: '/categories' },
      { name: '自拍杆', href: '/categories' },
      { name: '充电器', href: '/categories' },
      { name: '手机镜头', href: '/categories' },
      { name: '线控耳机', href: '/categories' },
    ],
  },
  {
    title: '苹果配件',
    links: [
      { name: 'iPhone壳', href: '/categories' },
      { name: 'iPhone膜', href: '/categories' },
      { name: 'iPad护套', href: '/categories' },
      { name: 'iPad贴膜', href: '/categories' },
      { name: '苹果表贴膜', href: '/categories' },
      { name: '苹果表表带', href: '/categories' },
    ],
  },
  {
    title: '热门市场',
    links: [
      { name: '地摊夜市', href: '/categories' },
      { name: '跨境外贸', href: '/categories' },
      { name: '配件大全', href: '/categories' },
      { name: '手机维修', href: '/categories' },
      { name: '微商专供', href: '/categories' },
      { name: '淘宝代销', href: '/categories' },
    ],
  },
  {
    title: '正品品牌',
    links: [
      { name: '罗马仕', href: '/categories' },
      { name: '品胜', href: '/categories' },
      { name: 'Remax', href: '/categories' },
    ],
  },
  {
    title: '主题导购',
    links: [
      { name: '跨境外贸专供', href: '/categories' },
      { name: '地摊夜市爆款', href: '/categories' },
      { name: '手机维修店', href: '/categories' },
      { name: '手机配件大卖场', href: '/categories' },
      { name: '微商进货', href: '/categories' },
      { name: '无门槛一分钱拿样', href: '/categories' },
    ],
  },
];

// 线下手机店 / 维修店 示例商品
const OFFLINE_ITEMS = [
  { name: '入耳式涡轮重低音带麦耳机', price: '83.20', count: '100 件', img: LOCAL_IMGS[0] },
  { name: '360度旋转手机卡通指环支架', price: '83.20', count: '200 件', img: LOCAL_IMGS[1] },
  { name: '安卓转type-c二合一数据线', price: '83.20', count: '99 件', img: LOCAL_IMGS[2] },
];
const REPAIR_ITEMS = [
  { name: '苹果iPhone液晶屏幕总成', price: '83.20', count: '100 件', img: LOCAL_IMGS[3] },
  { name: '品胜正品酷派手机专用电池', price: '83.20', count: '6000 件', img: LOCAL_IMGS[4] },
  { name: '苹果iPhone前置摄像头', price: '83.20', count: '100 件', img: LOCAL_IMGS[5] },
];

// 跨境/地摊 示例商品
const CROSS_ITEMS = [
  { name: '专业外贸款智能手表手环', price: '83.20', count: '100 件', img: LOCAL_IMGS[6] },
  { name: 'iPhone7保护套plus真皮套', price: '83.20', count: '200 件', img: LOCAL_IMGS[7] },
  { name: 'ebay热销三星S7背夹充电宝', price: '83.20', count: '99 件', img: LOCAL_IMGS[8] },
];
const STALL_ITEMS = [
  { name: 'DIYIE马卡龙系列骨头指环支架', price: '83.20', count: '100 件', img: LOCAL_IMGS[9] },
  { name: '卡斐乐 二合一伸缩苹果数据线', price: '83.20', count: '6000 件', img: LOCAL_IMGS[10] },
  { name: '倍思正品 2.1A手机充电器', price: '83.20', count: '100 件', img: LOCAL_IMGS[11] },
];

// 限时包邮
const LIMIT_FREE_SHIP = [
  { name: '新款QI车载红外线感应无线充电器出风口二合一手机支架无线快充', price: '50.00', batch: '1套起批 ¥60.00', area: '广东', img: LOCAL_IMGS[0] },
  { name: '适用华为p30 pro钢化膜工厂直销huawei P30PRO曲屏钢化膜手机贴膜', price: '8.50', batch: '5片起批 ¥8.50', area: '广东', img: LOCAL_IMGS[12] },
  { name: '适用三星S9 S8 Note9 Note8全屏曲面防窥钢化膜', price: '18.00', batch: '5张起批 ¥18.00', area: '广东', img: LOCAL_IMGS[9] },
  { name: '懒人手机支架子桌面 手机平板支架电脑调节床头抖音直播看电视', price: '1.05', batch: '3盒起批 ¥1.30', area: '广东', img: LOCAL_IMGS[1] },
  { name: '包邮蓝牙耳机163挂耳式4.1立体声 头戴式运动蓝牙耳机工厂直销', price: '18.00', batch: '1条起批 ¥18.00', area: '广东', img: LOCAL_IMGS[6] },
  { name: '适用手机转接头充电听歌苹果胶囊转接头药丸转换器', price: '1.80', batch: '20个起批 ¥1.80', area: '广东', img: LOCAL_IMGS[2] },
  { name: '厂家批发适用OPPO闪充手机数据线 VOOC快速加长2米安卓通用充电线', price: '11.90', batch: '2条起批 ¥11.90', area: '广东', img: LOCAL_IMGS[10] },
  { name: 'Type-c数据线 新接口数据线 华为mete10数据线 p9手机快充线', price: '4.20', batch: '2条起批 ¥4.90', area: '广东', img: LOCAL_IMGS[10] },
  { name: '冷野狮安卓数据线高速充电器vivo小米适用苹果手机快充通用闪充', price: '10.00', batch: '1条起批 ¥18.00', area: '广东', img: LOCAL_IMGS[10] },
  { name: '2A快充20000毫安大容量充电宝手机平板电脑移动电源', price: '88.00', batch: '1个起批 ¥118.00', area: '广东', img: LOCAL_IMGS[4] },
];

// 每日推荐 · 潮出个性
const DAILY_ITEMS = [
  { name: '22倍手机长焦镜头 通用手机外置望远镜镜头22X远距离高清摄影放大', price: '90.00', count: '1030 个', img: LOCAL_IMGS[1] },
  { name: 'CYKE 手机支架懒人多功能桌面旅行直播补光灯落地三脚架抖音神器', price: '45.00', count: '15785 个', img: LOCAL_IMGS[2] },
  { name: '批yoobao羽博10000毫安充电宝可爱图案定制创意移动电源快速充电', price: '39.90', count: '1445 个', img: LOCAL_IMGS[4] },
  { name: 'CYKE 三合一多功能快手直播视频落地懒人支架美颜补光品牌OEM定制', price: '39.00', count: '11159 个', img: LOCAL_IMGS[3] },
  { name: '创意精品手机支架 磁吸车载手机支架 厂家直销礼品定制热卖促销', price: '6.00', count: '10422 个', img: LOCAL_IMGS[5] },
  { name: '批发定制蓝牙耳机无线双耳立体音入耳式运动磁吸金属蓝牙耳机', price: '53.00', count: '2094 条', img: LOCAL_IMGS[6] },
  { name: 'iphonex液态硅胶手机壳全包新款适用苹果x防摔套iphone xs手机套8', price: '22.80', count: '47567 个', img: LOCAL_IMGS[11] },
  { name: '工厂直销多功能磁性磁力磁吸车载手机导航金属360度旋转磁铁支架', price: '2.30', count: '90241 套', img: LOCAL_IMGS[7] },
];

// 潜力好货
const POTENTIAL_ITEMS = [
  { name: '跨境爆款I7 MIN I4.1tws蓝牙耳机 真立体TWS带充电仓无线蓝牙耳机', price: '28.00', count: '71676 条', img: LOCAL_IMGS[8] },
  { name: '网店热销华为mate 20手机壳PC皮质mate 20 pro保护套插卡支架商务', price: '8.80', count: '447 个', img: LOCAL_IMGS[11] },
  { name: '适用iPhone XS max手机壳拼色皮纹苹果XR二合一保护套xs防摔皮套', price: '5.30', count: '4520 个', img: LOCAL_IMGS[11] },
  { name: 'TWSi8x蓝牙耳机i7s迷你运动双耳耳塞式立体声i9s亚马逊跨境批发', price: '29.00', count: '42517 套', img: LOCAL_IMGS[8] },
  { name: 'GKK 新款适用iphone xs指环支架手机壳苹果7/8Plus二合一磁吸支架', price: '11.00', count: '163205 个', img: LOCAL_IMGS[10] },
  { name: '适用iphoneX钢化玻璃膜苹果6splus手机保护膜3D曲面全覆盖碳纤维', price: '4.60', count: '1212492 张', img: LOCAL_IMGS[9] },
  { name: '适用于苹果2018平板电脑mini皮套air2保护套树脂新ipad保护套10.5', price: '15.90', count: '88018 个', img: LOCAL_IMGS[10] },
  { name: '冇心新款 迷你10000毫安 快充移动电源可爱便携聚合物充电宝', price: '49.00', count: '122940 个', img: LOCAL_IMGS[4] },
];

export default function HomePage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  /* 2026-03-15 根因：SSR 与客户端首帧 DOM 顺序不一致导致 Hydration 报错（Next MetadataOutlet vs 页面根节点）。修复：仅在客户端挂载后渲染正文，首帧服务端/客户端均输出同一占位，避免树结构不一致。 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const load = async () => {
      try {
        const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG || 'test-company';
        const [catRes, prodRes] = await Promise.all([
          api.get('/public/categories', { params: { tenantSlug } }),
          api.get('/public/products', { params: { tenantSlug } }),
        ]);
        setCategories(catRes.data || []);
        setApiProducts(prodRes.data || []);
      } catch {
        // 静默失败，使用静态内容
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mounted]);

  /* Pro Max 检查：可点击链接统一 hover/焦点/过渡，无布局偏移 */
  const linkNav =
    'rounded px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer';
  const cardLink =
    'rounded border border-border p-1.5 text-center transition-colors duration-200 hover:border-primary hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer';

  /* 2026-03-15 Hydration：服务端与客户端必须同一根结构；用单一根节点 + suppressHydrationWarning 避免 Next.MetadataOutlet 与页面根顺序不一致 */
  const placeholder = (
    <div className="min-w-0">
      <div className="mb-3 border-b border-border pb-3" aria-hidden />
      <div className="flex gap-4">
        <aside className="w-56 shrink-0 rounded-md border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">加载中…</p>
        </aside>
        <div className="min-w-0 flex-1 rounded-md border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">加载中…</p>
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return <div className="min-w-0" suppressHydrationWarning>{placeholder}</div>;
  }

  return (
    <div className="min-w-0" suppressHydrationWarning>
      {/* 2026-03-15 P0：未登录可浏览说明，与导航一致 */}
      <p className="mb-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
        未登录可浏览类目与部分商品，登录后查看价格与下单
      </p>
      {/* 顶部：市场导航 + 产品/供应商/求购 + 搜索，参考 1688 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <nav className="flex flex-wrap gap-x-1 gap-y-1 text-xs" aria-label="市场导航">
          {MARKETS.map((m) => (
            <a key={m.name} href={m.href} className={linkNav}>
              {m.name}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="/categories" className="text-xs text-muted-foreground hover:underline">产品</a>
          <a href="/orders" className="text-xs text-muted-foreground hover:underline">供应商</a>
          <a href="/cart" className="text-xs text-muted-foreground hover:underline">求购</a>
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!search.trim()) return;
              window.location.href = `/categories/search?q=${encodeURIComponent(search.trim())}`;
            }}
          >
            <input
              aria-label="搜索本市场"
              className="h-8 w-44 rounded border border-input bg-background px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="搜本市场"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="h-8 cursor-pointer rounded bg-primary px-2 text-xs text-primary-foreground transition-colors duration-200 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              搜全站
            </button>
          </form>
        </div>
      </div>

      <div className="flex gap-4">
        {/* 左侧：手机及配件类目，完全参考 1688 */}
        <aside className="w-56 shrink-0 rounded-md border border-border bg-card p-3 text-sm">
          <h2 className="mb-2 text-sm font-semibold">手机及配件类目</h2>
          {loading && <p className="text-xs text-muted-foreground">加载类目中…</p>}
          {!loading && categories.length > 0 ? (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <a href={`/categories/${c.id}`} className="font-medium text-foreground transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded cursor-pointer">{c.name}</a>
                  {c.children && c.children.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 pl-0 text-xs text-muted-foreground">
                      {c.children.slice(0, 6).map((sc) => (
                    <li key={sc.id}>
                        <a href={`/categories/${sc.id}`} className="text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded cursor-pointer">{sc.name}</a>
                      </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {CATEGORY_GROUPS.map((g) => (
                <li key={g.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground">{g.title}</h3>
                  <ul className="mt-1 space-y-0.5">
                    {g.links.map((l) => (
                      <li key={l.name}>
                        <a href={l.href} className="text-xs text-foreground transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded cursor-pointer">{l.name}</a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 右侧主内容区 */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 今日推荐 倒计时占位 */}
          <section className="rounded-md border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">今日推荐</span>
              <span className="text-muted-foreground">数码行业销量排行</span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">00 天 00:00:00</div>
          </section>

          {/* 线下手机店 / 维修店 双栏 */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">线下手机店</h3>
              <p className="text-[10px] text-muted-foreground">线下热卖手机精选 · 买家保障 15天包换 48小时发货</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {['手机壳', '手机膜', '手机支架', '数据线', '耳机', '移动电源', '充电器', '存储卡'].map((t) => (
                  <a key={t} href="/categories" className="text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer">{t}</a>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {OFFLINE_ITEMS.map((item, i) => (
                  <a key={i} href="/categories" className={cardLink}>
                    <div className="relative mx-auto aspect-square w-full max-w-[80px] overflow-hidden rounded bg-muted">
                      <Image src={item.img} alt={item.name} fill className="object-cover" sizes="80px" unoptimized />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px]">{item.name}</p>
                    <p className="text-[10px] font-medium text-primary">¥ {item.price}</p>
                    <p className="text-[10px] text-muted-foreground">成交 {item.count}</p>
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">手机维修店</h3>
              <p className="text-[10px] text-muted-foreground">手机维修配件一站式进货市场 · 品牌货 工厂货</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {['手机屏幕', '手机按键', '手机摄像头', '手机读卡器', '手机剪卡器', '手机电池'].map((t) => (
                  <a key={t} href="/categories" className="text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer">{t}</a>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {REPAIR_ITEMS.map((item, i) => (
                  <a key={i} href="/categories" className={cardLink}>
                    <div className="relative mx-auto aspect-square w-full max-w-[80px] overflow-hidden rounded bg-muted">
                      <Image src={item.img} alt={item.name} fill className="object-cover" sizes="80px" unoptimized />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px]">{item.name}</p>
                    <p className="text-[10px] font-medium text-primary">¥ {item.price}</p>
                    <p className="text-[10px] text-muted-foreground">成交 {item.count}</p>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* 跨境专供 / 地摊爆款 双栏 */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">数码跨境专供</h3>
              <p className="text-[10px] text-muted-foreground">亚马逊、AE、Wish等外贸专业平台货源 · 15天包换 48小时发货 OEM定制</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {['手机保护套', '蓝牙耳机', '移动电源', '智能手表', '手机支架', '数据线', '鼠标垫', '光电鼠标'].map((t) => (
                  <a key={t} href="/categories" className="text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer">{t}</a>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {CROSS_ITEMS.map((item, i) => (
                  <a key={i} href="/categories" className={cardLink}>
                    <div className="relative mx-auto aspect-square w-full max-w-[80px] overflow-hidden rounded bg-muted">
                      <Image src={item.img} alt={item.name} fill className="object-cover" sizes="80px" unoptimized />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px]">{item.name}</p>
                    <p className="text-[10px] font-medium text-primary">¥ {item.price}</p>
                    <p className="text-[10px] text-muted-foreground">成交 {item.count}</p>
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <h3 className="text-sm font-semibold">地摊夜市爆款</h3>
              <p className="text-[10px] text-muted-foreground">摆摊不用愁，数码创业练摊热门货源精选 · 新潮数码 爆款货源 创业首选</p>
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {['手机保护套', '数据线', '手机支架', '手机贴膜', '充电器', '耳机', '自拍杆', '移动电源'].map((t) => (
                  <a key={t} href="/categories" className="text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer">{t}</a>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {STALL_ITEMS.map((item, i) => (
                  <a key={i} href="/categories" className={cardLink}>
                    <div className="relative mx-auto aspect-square w-full max-w-[80px] overflow-hidden rounded bg-muted">
                      <Image src={item.img} alt={item.name} fill className="object-cover" sizes="80px" unoptimized />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px]">{item.name}</p>
                    <p className="text-[10px] font-medium text-primary">¥ {item.price}</p>
                    <p className="text-[10px] text-muted-foreground">成交 {item.count}</p>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* 限时包邮 */}
          <section className="rounded-md border border-border bg-card p-3">
            <h3 className="mb-2 text-sm font-semibold">限时包邮</h3>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
              {LIMIT_FREE_SHIP.map((item, i) => (
                <a key={i} href="/categories" className={`${cardLink} flex gap-2 p-2 text-left`}>
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                    <Image src={item.img} alt={item.name} fill className="object-cover" sizes="64px" unoptimized />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[10px]">{item.name}</p>
                    <p className="mt-0.5 text-xs font-medium text-primary">¥{item.price}</p>
                    <p className="text-[10px] text-muted-foreground">{item.batch}</p>
                    <p className="text-[10px] text-muted-foreground">{item.area} 已拼 0</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* 每日推荐 · 潮出个性 */}
          <section className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">每日推荐</h3>
              <span className="text-[10px] text-muted-foreground">潮出个性 新出创意 · 好货不间断更新</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {DAILY_ITEMS.map((item, i) => (
                <a key={i} href="/categories" className={cardLink + ' p-2'}>
                  <div className="relative aspect-square w-full overflow-hidden rounded bg-muted">
                    <Image src={item.img} alt={item.name} fill className="object-cover" sizes="160px" unoptimized />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs">{item.name}</p>
                  <p className="text-xs font-medium text-primary">¥ {item.price}</p>
                  <p className="text-[10px] text-muted-foreground">成交 {item.count}</p>
                </a>
              ))}
            </div>
          </section>

          {/* 潜力好货 */}
          <section className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">潜力好货</h3>
              <span className="text-[10px] text-muted-foreground">潜力爆款 市场趋势 · 每日更新为您呈现</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {POTENTIAL_ITEMS.map((item, i) => (
                <a key={i} href="/categories" className={cardLink + ' p-2'}>
                  <div className="relative aspect-square w-full overflow-hidden rounded bg-muted">
                    <Image src={item.img} alt={item.name} fill className="object-cover" sizes="160px" unoptimized />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs">{item.name}</p>
                  <p className="text-xs font-medium text-primary">¥ {item.price}</p>
                  <p className="text-[10px] text-muted-foreground">成交 {item.count}</p>
                </a>
              ))}
            </div>
          </section>

          {/* 底部 TOP牛商 好品推荐 */}
          <section className="rounded-md border border-border bg-card p-3 text-xs">
            <h3 className="mb-2 font-semibold">TOP牛商 · 好品推荐</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span className="font-medium text-foreground">手机</span>
              {['智能手机', '非智能机', '老人手机', '三防手机', '儿童手机', '低价手机'].map((t) => (
                <a key={t} href="/categories" className="transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer">{t}</a>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span className="font-medium text-foreground">热门配件</span>
              {['手机壳', '手机贴膜', '移动电源', '手机支架', '数据线', '自拍杆', '蓝牙耳机', '充电器'].map((t) => (
                <a key={t} href="/categories" className="transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer">{t}</a>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span className="font-medium text-foreground">知名品牌</span>
              {['品胜', '罗马仕', 'ROCK', '倍思', 'Remax', '耐尔金', '海陆通', '冇心'].map((t) => (
                <a key={t} href="/categories" className="transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer">{t}</a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
