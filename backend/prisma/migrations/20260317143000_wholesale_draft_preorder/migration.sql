-- Wholesale DRAFT + Preorder Limits
-- Created: 2026-03-17T14:30:00
-- SOStatus 新增 DRAFT, OrderSource 新增 REORDER_MERGED, 预售限购表

-- 扩展枚举
ALTER TYPE "SOStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "OrderSource" ADD VALUE IF NOT EXISTS 'REORDER_MERGED';

-- 预售限购表
CREATE TABLE "preorder_limits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "max_qty_per_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "preorder_limits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "preorder_limits_tenant_id_sku_id_key" ON "preorder_limits"("tenant_id", "sku_id");
CREATE INDEX "preorder_limits_tenant_id_idx" ON "preorder_limits"("tenant_id");
CREATE INDEX "preorder_limits_sku_id_idx" ON "preorder_limits"("sku_id");
ALTER TABLE "preorder_limits" ADD CONSTRAINT "preorder_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "preorder_limits" ADD CONSTRAINT "preorder_limits_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "preorder_tier_limits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "tier" "CustomerTier" NOT NULL,
    "max_qty_per_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "preorder_tier_limits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "preorder_tier_limits_tenant_id_sku_id_tier_key" ON "preorder_tier_limits"("tenant_id", "sku_id", "tier");
CREATE INDEX "preorder_tier_limits_tenant_id_idx" ON "preorder_tier_limits"("tenant_id");
CREATE INDEX "preorder_tier_limits_sku_id_idx" ON "preorder_tier_limits"("sku_id");
ALTER TABLE "preorder_tier_limits" ADD CONSTRAINT "preorder_tier_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "preorder_tier_limits" ADD CONSTRAINT "preorder_tier_limits_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
