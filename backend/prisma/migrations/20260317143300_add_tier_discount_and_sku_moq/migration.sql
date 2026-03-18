-- Updated: 2026-03-17T14:33:00 - TierDiscountPolicy + Sku.moq
-- CreateTable
CREATE TABLE "tier_discount_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tier" "CustomerTier" NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tier_discount_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tier_discount_policies_tenant_id_tier_key" ON "tier_discount_policies"("tenant_id", "tier");

-- CreateIndex
CREATE INDEX "tier_discount_policies_tenant_id_idx" ON "tier_discount_policies"("tenant_id");

-- AddForeignKey
ALTER TABLE "tier_discount_policies" ADD CONSTRAINT "tier_discount_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "skus" ADD COLUMN "moq" INTEGER DEFAULT 1;
