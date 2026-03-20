// 2026-03-20T16:40:00 - 批发站角色分流：零售商采购 vs 网站商品管理（对齐 PRD A/B 端）
/** 零售商侧：登录后为「专业采购」前台（与旧 VIEWER 同属批发客户 JWT） */
export const RETAIL_PROCUREMENT_ROLES = new Set(['VIEWER', 'RETAIL_BUYER']);

export const CATALOG_ADMIN_ROLE = 'CATALOG_ADMIN';

export function isRetailProcurementRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return RETAIL_PROCUREMENT_ROLES.has(role);
}

export function isCatalogAdminRole(role: string | undefined | null): boolean {
  return role === CATALOG_ADMIN_ROLE;
}

/** 仅商品/价格/限购等后台，不含仓库波次、现金、退货作业 */
export function isCatalogOnlyAdminRole(role: string | undefined | null): boolean {
  return role === CATALOG_ADMIN_ROLE;
}
