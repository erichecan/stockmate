// 2026-03-20T16:35:00 - 可维护商品主数据、SKU、MOQ、等级折扣、预售限购等（PRD：网站管理/运营分工）
import { UserRole } from '@prisma/client';

export const CATALOG_MAINTENANCE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.CATALOG_ADMIN,
  UserRole.SALES_SUPERVISOR,
  UserRole.OPERATIONS,
];
