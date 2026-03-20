/**
 * 库存管理页面 - 入库/出库/调拨/调整 对话框 E2E
 * Updated: 2026-02-28T12:10:00
 * Updated: 2026-03-19T19:05:00 - wholesale-frontend 为批发采购站，无 /dashboard/inventory；
 * 库存管理 UI 与 E2E 在主仓库 `frontend` 应用；此处整组 skip 避免登录页改版后阻塞 CI/发布。
 */

import { test } from '@playwright/test';

test.describe.skip('库存管理 - 对话框（批发前台不适用，见 frontend 应用）', () => {
  test('占位说明', () => {
    // 若需验证入库/出库对话框，请在 `frontend` 下配置 Playwright 并指向含 inventory 的基座。
  });
});
