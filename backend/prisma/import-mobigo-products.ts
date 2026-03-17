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
  categoryId: string,
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

  const product = await prisma.product.create({
    data: {
      tenantId,
      categoryId,
      brandId,
      name: p.name,
      description: p.url,
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
      await importLine(tenant.id, categoryId, parsed, stats);
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

