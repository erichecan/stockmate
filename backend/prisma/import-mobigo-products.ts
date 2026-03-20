// Updated: 2026-03-17T02:50:00 - 从 Mobigo 爬虫导入商品到主租户（Neon 适配）

import 'dotenv/config';
import fs from 'node:fs';
import type { WriteStream } from 'node:fs';
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
  strictSkippedNoExactCategory: number;
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
    .replace(/^[0-9]+\.\s*/g, '')
    .replace(/^[*]+|[*!]+$/g, '')
    .replace(/[📲🖥️]/g, '')
    .replace(/^view all\s+/g, '')
    .replace(/^a\s+(essential|summer)\b/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 严格类目路径解析结果，用于落库与跳过清单。Updated: 2026-03-20T02:45:12 */
type BreadcrumbResolve =
  | { ok: true; categoryId: string; matchedPath: string[] }
  | {
      ok: false;
      reason: 'empty_path' | 'segment_not_found';
      matchedPath: string[];
      failedSegment?: string;
      failedSegmentNormalized?: string;
      siblingNamesSample?: string[];
    };

function resolveCategoryFromBreadcrumb(
  sourceCategories: string[] | undefined,
  rootCategoryId: string,
  categories: FlatCategory[],
): BreadcrumbResolve {
  if (!sourceCategories?.length) {
    return { ok: false, reason: 'empty_path', matchedPath: [] };
  }
  const childrenByParent = new Map<string | null, FlatCategory[]>();
  for (const category of categories) {
    if (category.id === rootCategoryId) continue;
    const key = category.parentId ?? null;
    const list: FlatCategory[] = childrenByParent.get(key) ?? [];
    list.push(category);
    childrenByParent.set(key, list);
  }

  let currentParentId: string | null = null;
  let resolved: FlatCategory | null = null;
  const matchedPath: string[] = [];

  for (const rawSegment of sourceCategories) {
    const segmentNorm = normalizeText(rawSegment);
    if (!segmentNorm) continue;
    const children: FlatCategory[] = childrenByParent.get(currentParentId) ?? [];
    const next: FlatCategory | undefined = children.find(
      (c: FlatCategory) => normalizeText(c.name) === segmentNorm,
    );
    if (!next) {
      // Updated: 2026-03-19T22:31:40 - 严格模式下必须逐层精确命中，否则视为无法映射
      const siblingNamesSample = children
        .map((c) => c.name)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 40);
      return {
        ok: false,
        reason: 'segment_not_found',
        matchedPath,
        failedSegment: rawSegment,
        failedSegmentNormalized: segmentNorm,
        siblingNamesSample,
      };
    }
    matchedPath.push(next.name);
    resolved = next;
    currentParentId = next.id;
  }

  if (!resolved?.id) {
    return { ok: false, reason: 'empty_path', matchedPath };
  }
  return { ok: true, categoryId: resolved.id, matchedPath };
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

// Updated: 2026-03-20T02:45:12 - 严格跳过写入 mobigo/data/mobigo-import-strict-skips.jsonl
function appendStrictSkipLog(
  stream: WriteStream | undefined,
  payload: Record<string, unknown>,
): void {
  if (!stream) return;
  stream.write(`${JSON.stringify(payload)}\n`);
}

async function importLine(
  tenantId: string,
  rootCategoryId: string,
  categories: FlatCategory[],
  p: MobigoProduct,
  stats: ImportStats,
  strictSkipLog?: WriteStream,
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
  // Updated: 2026-03-19T22:31:40 - 严格模式：仅允许按导航路径逐层精确匹配类目，禁止名称兜底
  const resolved = resolveCategoryFromBreadcrumb(p.categories, rootCategoryId, categories);
  if (!resolved.ok) {
    stats.strictSkippedNoExactCategory += 1;
    appendStrictSkipLog(strictSkipLog, {
      ts: new Date().toISOString(),
      kind: 'strict_category',
      skuCode,
      code: p.code,
      name: p.name,
      url: p.url,
      categoriesFromCrawl: p.categories ?? [],
      reason: resolved.reason,
      matchedPath: resolved.matchedPath,
      failedSegment: resolved.failedSegment,
      failedSegmentNormalized: resolved.failedSegmentNormalized,
      siblingNamesSample: resolved.siblingNamesSample,
    });
    return;
  }
  const categoryId = resolved.categoryId;

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

  // Updated: 2026-03-20T05:45:00 - 支持 MOBIGO_PRODUCTS_JSONL 覆盖默认路径（便于对快照单独导入）
  const dataPath = process.env.MOBIGO_PRODUCTS_JSONL
    ? path.resolve(process.env.MOBIGO_PRODUCTS_JSONL)
    : path.resolve(__dirname, '..', '..', 'mobigo', 'data', 'products-sample.jsonl');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`未找到爬虫输出文件: ${dataPath}，请先在 mobigo/ 运行 crawl:products`);
  }

  const strictSkipPath = path.resolve(
    __dirname,
    '..',
    '..',
    'mobigo',
    'data',
    'mobigo-import-strict-skips.jsonl',
  );
  const strictSkipLog = fs.createWriteStream(strictSkipPath, { encoding: 'utf-8', flags: 'w' });

  try {
    const categoryId = await ensureCategory(tenant.id);
    const categories = await prisma.category.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, parentId: true },
    });

    const stats: ImportStats = {
      productsCreated: 0,
      skusCreated: 0,
      productsSkippedExisting: 0,
      strictSkippedNoExactCategory: 0,
    };

    const stream = fs.createReadStream(dataPath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    console.log(`开始从 ${dataPath} 导入商品到租户 ${tenantSlug} (${tenant.id})`);
    console.log(`严格模式跳过明细将写入: ${strictSkipPath}`);

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as MobigoProduct;
        await importLine(tenant.id, categoryId, categories, parsed, stats, strictSkipLog);
      } catch (e) {
        console.warn('跳过无法解析的行:', e);
      }
    }

    console.log('导入完成:');
    console.log(`  新建 Product 数量: ${stats.productsCreated}`);
    console.log(`  新建 Sku 数量: ${stats.skusCreated}`);
    console.log(`  已存在 SKU 跳过: ${stats.productsSkippedExisting}`);
    console.log(`  严格模式类目未精确匹配跳过: ${stats.strictSkippedNoExactCategory}`);
    console.log(`  跳过清单: ${strictSkipPath}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      strictSkipLog.end((err: NodeJS.ErrnoException | null | undefined) =>
        err ? reject(err) : resolve(),
      );
    });
  }
}

main()
  .catch((err) => {
    console.error('导入过程出错:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

