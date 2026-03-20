-- Updated: 2026-03-19T15:02:41 - 退货工作台数据结构 + 新增角色

-- 1) 扩展用户角色枚举
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RETURN_SPECIALIST';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PICKER';

-- 2) 退货工作台枚举
CREATE TYPE "ReturnStatus" AS ENUM ('RECEIVED', 'MATCHED', 'DECIDED', 'PROCESSED');
CREATE TYPE "ReturnCondition" AS ENUM ('UNKNOWN', 'NEW_LIKE', 'GOOD', 'DAMAGED', 'BROKEN');
CREATE TYPE "ReturnDisposition" AS ENUM ('PENDING', 'DISCARD', 'REPAIR', 'DISCOUNT_SALE', 'RETAIL');

-- 3) 退货工作台主表
CREATE TABLE "return_records" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "source_order_id" TEXT,
  "source_order_number" TEXT,
  "sku_id" TEXT,
  "returned_qty" INTEGER NOT NULL DEFAULT 1,
  "status" "ReturnStatus" NOT NULL DEFAULT 'RECEIVED',
  "condition" "ReturnCondition" NOT NULL DEFAULT 'UNKNOWN',
  "disposition" "ReturnDisposition" NOT NULL DEFAULT 'PENDING',
  "issue_description" TEXT,
  "intake_notes" TEXT,
  "decision_notes" TEXT,
  "received_by_user_id" TEXT,
  "decided_by_user_id" TEXT,
  "decided_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "return_records_pkey" PRIMARY KEY ("id")
);

-- 4) 索引
CREATE INDEX "return_records_tenant_id_idx" ON "return_records"("tenant_id");
CREATE INDEX "return_records_tenant_id_status_idx" ON "return_records"("tenant_id", "status");
CREATE INDEX "return_records_tenant_id_disposition_idx" ON "return_records"("tenant_id", "disposition");
CREATE INDEX "return_records_source_order_id_idx" ON "return_records"("source_order_id");
CREATE INDEX "return_records_sku_id_idx" ON "return_records"("sku_id");
CREATE INDEX "return_records_created_at_idx" ON "return_records"("created_at");

-- 5) 外键
ALTER TABLE "return_records"
  ADD CONSTRAINT "return_records_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "return_records"
  ADD CONSTRAINT "return_records_source_order_id_fkey"
  FOREIGN KEY ("source_order_id") REFERENCES "sales_orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "return_records"
  ADD CONSTRAINT "return_records_sku_id_fkey"
  FOREIGN KEY ("sku_id") REFERENCES "skus"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
