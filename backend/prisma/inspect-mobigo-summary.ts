import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env['DATABASE_URL'] || process.env['DIRECT_DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_DATABASE_URL required');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantSlug = process.env.MOBIGO_TENANT_SLUG || 'test-company';
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    throw new Error(`未找到租户 slug=${tenantSlug}`);
  }
  const tenantId = tenant.id;

  const [productCount, skuCount, brandCount, categoryCount, mobigoProductCount, mobigoSkuCount] =
    await Promise.all([
      prisma.product.count({ where: { tenantId } }),
      prisma.sku.count({ where: { tenantId } }),
      prisma.brand.count({ where: { tenantId } }),
      prisma.category.count({ where: { tenantId } }),
      prisma.product.count({
        where: {
          tenantId,
          tags: {
            path: [],
            array_contains: 'MOBIGO',
          },
        },
      }),
      prisma.sku.count({
        where: {
          tenantId,
          code: { startsWith: 'MOBIGO-' },
        },
      }),
    ]);

  console.log('Mobigo 导入统计：');
  console.log(`  当前租户: ${tenantSlug} (${tenantId})`);
  console.log(`  全部 Product 数量: ${productCount}`);
  console.log(`  其中 Mobigo Product (tags 包含 "MOBIGO"): ${mobigoProductCount}`);
  console.log(`  全部 Sku 数量: ${skuCount}`);
  console.log(`  其中 Mobigo Sku (code 以 "MOBIGO-" 开头): ${mobigoSkuCount}`);
  console.log(`  Brand 品牌数量: ${brandCount}`);
  console.log(`  Category 分类数量: ${categoryCount}`);
}

main()
  .catch((err) => {
    console.error('inspect-mobigo-summary 出错:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

