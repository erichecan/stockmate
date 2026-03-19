// Updated: 2026-03-17T02:50:00 - 从 Mobigo 爬虫导入商品到主租户（Neon 适配）

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { PrismaClient, ProductStatus } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

type MobigoProduct = {
  url: string;
  code?: string;
  name?: string;
  // Updated: 2026-03-19T10:36:35 - 导入商品描述（来自 Mobigo 抓取）
  description?: string;
  priceText?: string;
  currency?: string;
  categories?: string[];
  imageUrls?: string[];
};

type ImportStats = {
  productsCreated: number;
  skusCreated: number;
  productsSkippedExisting: number;
};

type FlatCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

function parsePrice(priceText?: string): { amount?: string; currency?: string } {
  if (!priceText) return {};
  const trimmed = priceText.replace(/\s+/g, ' ').trim();
  const numMatch = trimmed.match(/([0-9]+(?:\.[0-9]+)?)/);
  const curMatch = trimmed.match(/(€|£|\$)/);
  return {
    amount: numMatch ? numMatch[1] : undefined,
    currency: curMatch ? curMatch[1] : undefined,
  };
}

async function ensureCategory(tenantId: string): Promise<string> {
  const code = 'MOBIGO_ROOT';
  const existing = await prisma.category.findUnique({
    where: { code_tenantId: { code, tenantId } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.category.create({
    data: {
      tenantId,
      code,
      name: 'Mobigo Imported',
      sortOrder: 0,
    },
    select: { id: true },
  });
  return created.id;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCategoryDepthMap(categories: FlatCategory[]): Map<string, number> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const depthMap = new Map<string, number>();
  const getDepth = (id: string): number => {
    if (depthMap.has(id)) return depthMap.get(id)!;
    const current = byId.get(id);
    if (!current) return 0;
    if (!current.parentId) {
      depthMap.set(id, 0);
      return 0;
    }
    const depth = getDepth(current.parentId) + 1;
    depthMap.set(id, depth);
    return depth;
  };
  for (const c of categories) getDepth(c.id);
  return depthMap;
}

function scoreCategory(productNameNorm: string, categoryName: string, depth: number): number {
  const categoryNorm = normalizeText(categoryName);
  if (!categoryNorm) return -1;
  if (productNameNorm.includes(categoryNorm)) {
    return 2000 + categoryNorm.length * 10 + depth * 20;
  }
  const tokens = categoryNorm.split(' ').filter((t) => t.length >= 3);
  if (!tokens.length) return -1;
  let hits = 0;
  for (const t of tokens) {
    if (productNameNorm.includes(t)) hits += 1;
  }
  if (hits === 0) return -1;
  const hitRatio = hits / tokens.length;
  return Math.round(hitRatio * 1000 + hits * 30 + depth * 20);
}

function pickFallbackCategoryId(
  productNameNorm: string,
  categoryByNameNorm: Map<string, string>,
): string | null {
  const fallbackRules: Array<{ re: RegExp; categoryNames: string[] }> = [
    { re: /\biphone\b/, categoryNames: ['apple iphone cases', 'iphone 手机壳'] },
    { re: /\bgalaxy\b|\bsamsung\b/, categoryNames: ['samsung galaxy cases'] },
    { re: /\bhuawei\b/, categoryNames: ['huawei cases'] },
    { re: /\bnokia\b/, categoryNames: ['nokia cases'] },
    { re: /\bipad\b|\btablet\b/, categoryNames: ['tablet cases covers'] },
    { re: /\bairpod\b|\bair tags?\b/, categoryNames: ['airpod cases air tags'] },
    { re: /\bpower\s*bank\b/, categoryNames: ['power bank'] },
    { re: /\bcharger\b|\bplug\b/, categoryNames: ['chargers and plugs'] },
    { re: /\bcable\b|\btype c\b|\busb\b/, categoryNames: ['cable adapter'] },
    {
      re: /\bscreen\s*protector\b|\btempered\b|\bglass\b/,
      categoryNames: ['screen protector', 'tablet tempered glass'],
    },
  ];
  for (const rule of fallbackRules) {
    if (!rule.re.test(productNameNorm)) continue;
    for (const name of rule.categoryNames) {
      const id = categoryByNameNorm.get(name);
      if (id) return id;
    }
  }
  // Updated: 2026-03-19T00:05:50 - 最终兜底分类，避免新导入商品落到 Mobigo Imported
  if (/\blcd\b|\bbattery\b|\badhesive\b|\btape\b|\bdigitizer\b/.test(productNameNorm)) {
    return categoryByNameNorm.get('parts') || null;
  }
  return categoryByNameNorm.get('accessories') || null;
}

function pickBestCategoryId(
  productName: string,
  sourceCategories: string[] | undefined,
  rootCategoryId: string,
  categories: FlatCategory[],
  depthMap: Map<string, number>,
): string {
  // Updated: 2026-03-19T10:23:50 - 导入时优先使用 Mobigo 原始面包屑类目映射
  const breadcrumbCategoryId = pickCategoryIdFromBreadcrumb(
    sourceCategories,
    rootCategoryId,
    categories,
    depthMap,
  );
  if (breadcrumbCategoryId) {
    return breadcrumbCategoryId;
  }

  const nameNorm = normalizeText(productName);
  const categoryByNameNorm = new Map<string, string>(
    categories.map((c) => [normalizeText(c.name), c.id]),
  );
  let best: { id: string; score: number } | null = null;
  for (const c of categories) {
    if (c.id === rootCategoryId) continue;
    const score = scoreCategory(nameNorm, c.name, depthMap.get(c.id) ?? 0);
    // Updated: 2026-03-19T00:02:40 - 降低阈值以提升型号关键词匹配覆盖率
    if (score < 700) continue;
    if (!best || score > best.score) best = { id: c.id, score };
  }
  if (best?.id) return best.id;
  return pickFallbackCategoryId(nameNorm, categoryByNameNorm) || rootCategoryId;
}

function pickCategoryIdFromBreadcrumb(
  sourceCategories: string[] | undefined,
  rootCategoryId: string,
  categories: FlatCategory[],
  depthMap: Map<string, number>,
): string | null {
  if (!sourceCategories?.length) return null;

  const byNameNorm = new Map<string, FlatCategory[]>();
  for (const category of categories) {
    if (category.id === rootCategoryId) continue;
    const normalized = normalizeText(category.name);
    if (!normalized) continue;
    const list = byNameNorm.get(normalized) ?? [];
    list.push(category);
    byNameNorm.set(normalized, list);
  }

  const pickDeepest = (list: FlatCategory[]): string =>
    [...list]
      .sort((a, b) => (depthMap.get(b.id) ?? 0) - (depthMap.get(a.id) ?? 0))[0]
      .id;

  // 先从最深层 breadcrumb 开始做精确匹配
  for (let i = sourceCategories.length - 1; i >= 0; i -= 1) {
    const sourceNorm = normalizeText(sourceCategories[i]);
    if (!sourceNorm) continue;
    const exact = byNameNorm.get(sourceNorm);
    if (exact?.length) return pickDeepest(exact);
  }

  // 精确失败时做弱匹配（包含关系），避免轻微命名差异导致全部回退
  let best: { id: string; score: number } | null = null;
  for (let i = sourceCategories.length - 1; i >= 0; i -= 1) {
    const sourceNorm = normalizeText(sourceCategories[i]);
    if (!sourceNorm) continue;
    for (const category of categories) {
      if (category.id === rootCategoryId) continue;
      const targetNorm = normalizeText(category.name);
      if (!targetNorm) continue;
      if (!targetNorm.includes(sourceNorm) && !sourceNorm.includes(targetNorm)) continue;
      const depth = depthMap.get(category.id) ?? 0;
      const score = depth * 100 + Math.min(sourceNorm.length, targetNorm.length);
      if (!best || score > best.score) {
        best = { id: category.id, score };
      }
    }
  }
  return best?.id ?? null;
}

async function ensureBrand(tenantId: string, brandName?: string): Promise<string | undefined> {
  if (!brandName) return undefined;
  const code = brandName.toUpperCase().replace(/\s+/g, '_').slice(0, 50);
  const existing = await prisma.brand.findUnique({
    where: { code_tenantId: { code, tenantId } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.brand.create({
    data: {
      tenantId,
      code,
      name: brandName,
    },
    select: { id: true },
  });
  return created.id;
}

function guessBrandName(p: MobigoProduct): string | undefined {
  if (!p.name) return undefined;
  const candidates = ['Apple', 'Samsung', 'Huawei', 'Nokia', 'Baseus', 'Hoco', 'Intenso', 'Xiaomi'];
  const lower = p.name.toLowerCase();
  for (const b of candidates) {
    if (lower.includes(b.toLowerCase())) return b;
  }
  return undefined;
}

async function importLine(
  tenantId: string,
  rootCategoryId: string,
  categories: FlatCategory[],
  depthMap: Map<string, number>,
  p: MobigoProduct,
  stats: ImportStats,
): Promise<void> {
  if (!p.code || !p.name) {
    return;
  }

  const skuCode = `MOBIGO-${p.code}`;
  const existingSku = await prisma.sku.findUnique({
    where: { code_tenantId: { code: skuCode, tenantId } },
    select: { id: true, productId: true },
  });
  if (existingSku) {
    stats.productsSkippedExisting += 1;
    return;
  }

  const { amount, currency } = parsePrice(p.priceText);
  const price = amount ? amount : undefined;

  const brandId = await ensureBrand(tenantId, guessBrandName(p));
  // Updated: 2026-03-19T10:24:05 - 导入时优先按 Mobigo 面包屑类目匹配，失败再回退商品名称匹配
  const categoryId = pickBestCategoryId(
    p.name,
    p.categories,
    rootCategoryId,
    categories,
    depthMap,
  );

  const product = await prisma.product.create({
    data: {
      tenantId,
      categoryId,
      brandId,
      name: p.name,
      // Updated: 2026-03-19T10:36:35 - 优先使用抓取描述，缺失时回退 sourceUrl
      description: p.description?.trim() || p.url,
      status: ProductStatus.ACTIVE,
      images: p.imageUrls && p.imageUrls.length ? p.imageUrls : undefined,
      tags: ['MOBIGO'],
    },
    select: { id: true },
  });
  stats.productsCreated += 1;

  await prisma.sku.create({
    data: {
      tenantId,
      productId: product.id,
      code: skuCode,
      variantAttributes: {
        source: 'MOBIGO',
        sourceUrl: p.url,
        originalCode: p.code,
      },
      wholesalePrice: price ? price : undefined,
      retailPrice: price ? price : undefined,
      images: p.imageUrls && p.imageUrls.length ? p.imageUrls : undefined,
      isActive: true,
    },
  });
  stats.skusCreated += 1;
}

async function main() {
  const tenantSlug = process.env.MOBIGO_TENANT_SLUG || 'test-company';
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    throw new Error(`未找到租户 slug=${tenantSlug}，请确认 Tenant 配置。`);
  }

  const dataPath = path.resolve(__dirname, '..', '..', 'mobigo', 'data', 'products-sample.jsonl');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`未找到爬虫输出文件: ${dataPath}，请先在 mobigo/ 运行 crawl:products`);
  }

  const categoryId = await ensureCategory(tenant.id);
  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, name: true, parentId: true },
  });
  const depthMap = buildCategoryDepthMap(categories);

  const stats: ImportStats = {
    productsCreated: 0,
    skusCreated: 0,
    productsSkippedExisting: 0,
  };

  const stream = fs.createReadStream(dataPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  console.log(`开始从 ${dataPath} 导入商品到租户 ${tenantSlug} (${tenant.id})`);

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as MobigoProduct;
      await importLine(tenant.id, categoryId, categories, depthMap, parsed, stats);
    } catch (e) {
      console.warn('跳过无法解析的行:', e);
    }
  }

  console.log('导入完成:');
  console.log(`  新建 Product 数量: ${stats.productsCreated}`);
  console.log(`  新建 Sku 数量: ${stats.skusCreated}`);
  console.log(`  已存在 SKU 跳过: ${stats.productsSkippedExisting}`);
}

main()
  .catch((err) => {
    console.error('导入过程出错:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

