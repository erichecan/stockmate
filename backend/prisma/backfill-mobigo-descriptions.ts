// Updated: 2026-03-19T10:37:05 - 回填已导入 Mobigo 商品描述
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString =
  process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString)
  throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

type MobigoProduct = {
  url: string;
  code?: string;
  description?: string;
};

async function main() {
  const tenantSlug = process.env.MOBIGO_TENANT_SLUG || 'test-company';
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error(`未找到租户 slug=${tenantSlug}`);

  const dataPath = path.resolve(
    __dirname,
    '..',
    '..',
    'mobigo',
    'data',
    'products-sample.jsonl',
  );
  if (!fs.existsSync(dataPath)) {
    throw new Error(`未找到爬虫输出文件: ${dataPath}`);
  }

  const bySkuCode = new Map<string, { description: string; url: string }>();
  const stream = fs.createReadStream(dataPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as MobigoProduct;
      if (!parsed.code || !parsed.description?.trim()) continue;
      bySkuCode.set(`MOBIGO-${parsed.code}`, {
        description: parsed.description.trim(),
        url: parsed.url,
      });
    } catch {
      // Updated: 2026-03-19T10:37:05 - 非法 JSON 行直接跳过，继续处理后续数据
      continue;
    }
  }

  if (bySkuCode.size === 0) {
    console.log('未找到可回填 description 的 Mobigo 数据，结束。');
    return;
  }

  let updated = 0;
  let scanned = 0;
  const skus = await prisma.sku.findMany({
    where: { tenantId: tenant.id, code: { startsWith: 'MOBIGO-' } },
    select: { code: true, productId: true },
  });

  for (const sku of skus) {
    scanned += 1;
    const source = bySkuCode.get(sku.code);
    if (!source) continue;

    const product = await prisma.product.findUnique({
      where: { id: sku.productId },
      select: { id: true, description: true },
    });
    if (!product) continue;

    const currentDescription = (product.description || '').trim();
    const shouldBackfill =
      !currentDescription || currentDescription === source.url.trim();
    if (!shouldBackfill) continue;

    await prisma.product.update({
      where: { id: product.id },
      data: { description: source.description },
    });
    updated += 1;
  }

  console.log('Mobigo description 回填完成:');
  console.log(`  tenant: ${tenantSlug} (${tenant.id})`);
  console.log(`  扫描 SKU 数: ${scanned}`);
  console.log(`  回填 Product 数: ${updated}`);
}

main()
  .catch((err) => {
    console.error('backfill-mobigo-descriptions 出错:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
