/**
 * 一级类目筛选应包含二级类目商品
 * Updated: 2026-03-19T10:25:40
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000';

test('Products 页点击 BIG BRANDS 后仍有商品', async ({ page }) => {
  await page.goto(BASE + '/products');
  await page.waitForLoadState('networkidle').catch(() => {});

  const bigBrandsButton = page.getByRole('button', { name: /BIG BRANDS/i }).first();
  const hasBigBrands = (await bigBrandsButton.count()) > 0;
  test.skip(!hasBigBrands, '当前租户暂无 BIG BRANDS 类目，跳过本条验证');

  await bigBrandsButton.click();

  // Updated: 2026-03-19T10:25:40 - 验证一级类目筛选后可展示商品（后端应已包含子类）
  await expect(page.locator('a[href^="/products/"]').first()).toBeVisible({
    timeout: 10000,
  });
});
