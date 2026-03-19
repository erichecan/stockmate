// Updated: 2026-03-18T23:59:30 - 将 Mobigo Imported 商品重分配到对应类目
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString =
  process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

type FlatCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

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

  for (const c of categories) {
    getDepth(c.id);
  }
  return depthMap;
}

function scoreCategory(productNameNorm: string, categoryName: string, depth: number): number {
  const categoryNorm = normalizeText(categoryName);
  if (!categoryNorm) return -1;

  // 过滤纯噪声分类关键词，避免误匹配
  const noisy = new Set([
    'mobigo imported',
    'big brands',
    'attractive',
    'mobile cases by brand',
    'mobile cases by design',
  ]);
  if (noisy.has(categoryNorm)) return -1;

  // 全词组命中优先；层级越深优先
  if (productNameNorm.includes(categoryNorm)) {
    return 2000 + categoryNorm.length * 10 + depth * 20;
  }

  // 按 token 计算覆盖分
  const tokens = categoryNorm.split(' ').filter((t) => t.length >= 3);
  if (!tokens.length) return -1;
  let hits = 0;
  for (const t of tokens) {
    if (productNameNorm.includes(t)) hits += 1;
  }
  if (hits === 0) return -1;

  const hitRatio = hits / tokens.length;
  const score = Math.round(hitRatio * 1000 + hits * 30 + depth * 20);
  return score;
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

  // Updated: 2026-03-19T00:05:50 - 最终兜底：将未命中特征词的商品落到顶级类目，避免留在 Mobigo Imported
  if (/\blcd\b|\bbattery\b|\badhesive\b|\btape\b|\bdigitizer\b/.test(productNameNorm)) {
    return categoryByNameNorm.get('parts') || null;
  }
  return categoryByNameNorm.get('accessories') || null;
}

async function main() {
  const tenantSlug = process.env.MOBIGO_TENANT_SLUG || 'test-company';
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) throw new Error(`未找到租户 slug=${tenantSlug}`);

  const root = await prisma.category.findUnique({
    where: { code_tenantId: { code: 'MOBIGO_ROOT', tenantId: tenant.id } },
    select: { id: true },
  });
  if (!root) throw new Error('未找到 MOBIGO_ROOT 分类');

  const [allCategories, rootProducts] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, parentId: true },
    }),
    prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        categoryId: root.id,
        tags: { path: [], array_contains: 'MOBIGO' },
      },
      select: { id: true, name: true, categoryId: true },
    }),
  ]);

  const candidates = allCategories.filter((c) => c.id !== root.id);
  const depthMap = buildCategoryDepthMap(candidates);
  const categoryByNameNorm = new Map<string, string>(
    candidates.map((c) => [normalizeText(c.name), c.id]),
  );

  let moved = 0;
  let unresolved = 0;
  const unresolvedExamples: string[] = [];

  for (const p of rootProducts) {
    const productNameNorm = normalizeText(p.name);
    let best: { categoryId: string; score: number } | null = null;

    for (const c of candidates) {
      const score = scoreCategory(productNameNorm, c.name, depthMap.get(c.id) ?? 0);
      if (score < 0) continue;
      if (!best || score > best.score) {
        best = { categoryId: c.id, score };
      }
    }

    // 分数阈值避免误归类
    // Updated: 2026-03-19T00:02:40 - 降低阈值以覆盖型号命名类商品（如 Note5 / iPad Mini）
    if (!best || best.score < 700) {
      const fallbackCategoryId = pickFallbackCategoryId(
        productNameNorm,
        categoryByNameNorm,
      );
      if (!fallbackCategoryId) {
        unresolved += 1;
        if (unresolvedExamples.length < 20) unresolvedExamples.push(p.name);
        continue;
      }
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: fallbackCategoryId },
      });
      moved += 1;
      continue;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: { categoryId: best.categoryId },
    });
    moved += 1;
  }

  console.log('Mobigo 商品重分类完成:');
  console.log(`  tenant: ${tenantSlug} (${tenant.id})`);
  console.log(`  root 待处理: ${rootProducts.length}`);
  console.log(`  已迁移: ${moved}`);
  console.log(`  未命中: ${unresolved}`);
  if (unresolvedExamples.length) {
    console.log('  未命中示例(最多20条):');
    for (const name of unresolvedExamples) console.log(`    - ${name}`);
  }
}

main()
  .catch((err) => {
    console.error('reassign-mobigo-product-categories 出错:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
