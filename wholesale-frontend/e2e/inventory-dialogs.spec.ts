/**
 * 库存管理页面 - 入库/出库/调拨/调整 对话框 E2E 测试
 * Updated: 2026-02-28T12:10:00
 *
 * 验证：点击各按钮能打开对话框，Select 无空值报错，表单可正常填写
 */

import { test, expect } from '@playwright/test';

const LOGIN_EMAIL = 'admin@test.com';
const LOGIN_PASSWORD = 'Test1234!';
const TENANT_SLUG = 'test-company';

test.describe('库存管理 - 对话框', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('公司标识').fill(TENANT_SLUG);
    await page.getByLabel('邮箱').fill(LOGIN_EMAIL);
    await page.getByLabel('密码').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('入库对话框打开且货位可选「不指定」无报错', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/dashboard/inventory');
    await page.getByRole('button', { name: '入库' }).click();

    await expect(page.getByRole('dialog').filter({ hasText: '入库' })).toBeVisible();

    // 选择仓库
    const whTrigger = page.locator('button').filter({ hasText: /选择仓库/ }).first();
    await whTrigger.click();
    await page.getByRole('option').first().click();

    // 选择货位「不指定」（此前 value="" 会导致 Radix Select 报错）
    const binTrigger = page.locator('button').filter({ hasText: /选择货位|不指定/ }).first();
    await binTrigger.click();
    await page.getByRole('option', { name: '不指定' }).click();

    await page.getByPlaceholder('入库数量').fill('1');

    expect(pageErrors).toEqual([]);
  });

  test('出库对话框打开正常', async ({ page }) => {
    await page.goto('/dashboard/inventory');
    await page.getByRole('button', { name: '出库' }).click();
    await expect(page.getByRole('dialog').filter({ hasText: '出库' })).toBeVisible();
  });

  test('调拨对话框打开正常', async ({ page }) => {
    await page.goto('/dashboard/inventory');
    await page.getByRole('button', { name: '调拨' }).click();
    await expect(page.getByRole('dialog').filter({ hasText: '调拨' })).toBeVisible();
  });

  test('调整对话框打开正常', async ({ page }) => {
    await page.goto('/dashboard/inventory');
    await page.getByRole('button', { name: '调整' }).click();
    await expect(page.getByRole('dialog').filter({ hasText: '调整' })).toBeVisible();
  });
});
