-- CreateEnum
CREATE TYPE "StockFreezeStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReceiptStatus" ADD VALUE 'PENDING_ARRIVAL';
ALTER TYPE "ReceiptStatus" ADD VALUE 'ARRIVED';
ALTER TYPE "ReceiptStatus" ADD VALUE 'UNLOADED';
ALTER TYPE "ReceiptStatus" ADD VALUE 'SORTED';

-- AlterTable
ALTER TABLE "purchase_receipts" ALTER COLUMN "status" SET DEFAULT 'PENDING_ARRIVAL';

-- 数据兼容：旧状态映射到新阶段（2026-03-14）
UPDATE "purchase_receipts" SET "status" = 'PENDING_ARRIVAL' WHERE "status" = 'PENDING';
UPDATE "purchase_receipts" SET "status" = 'ARRIVED' WHERE "status" = 'IN_PROGRESS';

-- CreateTable
CREATE TABLE "stock_freezes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "bin_location_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "StockFreezeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_freezes_tenant_id_idx" ON "stock_freezes"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_freezes_sku_id_idx" ON "stock_freezes"("sku_id");

-- CreateIndex
CREATE INDEX "stock_freezes_warehouse_id_idx" ON "stock_freezes"("warehouse_id");

-- CreateIndex
CREATE INDEX "stock_freezes_status_idx" ON "stock_freezes"("status");

-- CreateIndex
CREATE INDEX "stock_freezes_created_at_idx" ON "stock_freezes"("created_at");

-- AddForeignKey
ALTER TABLE "stock_freezes" ADD CONSTRAINT "stock_freezes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_freezes" ADD CONSTRAINT "stock_freezes_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_freezes" ADD CONSTRAINT "stock_freezes_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_freezes" ADD CONSTRAINT "stock_freezes_bin_location_id_fkey" FOREIGN KEY ("bin_location_id") REFERENCES "bin_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
