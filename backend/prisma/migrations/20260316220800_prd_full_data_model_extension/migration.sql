-- PRD Full Data Model Extension
-- Created: 2026-03-16T22:08:00
-- Description: 按 PRD 全面扩展数据模型，覆盖信用管控、分级定价、多单位换算、
--              收款记录、发票、审批流程、交接班、欠货池、盘点、质检、波次拣货

-- =============================================
-- 1. 新建枚举类型
-- =============================================

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'OTHER');
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "ApprovalType" AS ENUM ('PRICE_OVERRIDE', 'CREDIT_INCREASE', 'LARGE_ORDER');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ShiftHandoverStatus" AS ENUM ('ACTIVE', 'PENDING_HANDOVER', 'COMPLETED', 'FLAGGED');
CREATE TYPE "BackorderStatus" AS ENUM ('PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');
CREATE TYPE "StockCountStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PickWaveStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- =============================================
-- 2. 扩展现有枚举
-- =============================================

ALTER TYPE "OrderSource" ADD VALUE 'SALES_REP';
ALTER TYPE "OrderSource" ADD VALUE 'PREORDER';
ALTER TYPE "SOStatus" ADD VALUE 'PARTIALLY_FULFILLED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'LOADING';
ALTER TYPE "ShipmentStatus" ADD VALUE 'RECEIVING';
ALTER TYPE "ShipmentStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "UserRole" ADD VALUE 'FINANCE';

-- =============================================
-- 3. 扩展现有表
-- =============================================

-- Tenant: 整单 MOQ + 默认定金比例
ALTER TABLE "tenants" ADD COLUMN "min_order_amount" DECIMAL(12,2);
ALTER TABLE "tenants" ADD COLUMN "default_deposit_rate" DECIMAL(3,2) DEFAULT 0.30;

-- Customer: 信用管控
ALTER TABLE "customers" ADD COLUMN "credit_limit" DECIMAL(12,2);
ALTER TABLE "customers" ADD COLUMN "outstanding_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN "credit_frozen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "payment_term_days" INTEGER NOT NULL DEFAULT 30;

-- Sku: 安全库存 + 底价保护
ALTER TABLE "skus" ADD COLUMN "safety_stock" INTEGER;
ALTER TABLE "skus" ADD COLUMN "reorder_point" INTEGER;
ALTER TABLE "skus" ADD COLUMN "floor_price" DECIMAL(10,2);

-- Product: 标签
ALTER TABLE "products" ADD COLUMN "tags" JSONB;

-- Shipment: 预售开关
ALTER TABLE "shipments" ADD COLUMN "preorder_enabled" BOOLEAN NOT NULL DEFAULT false;

-- SalesOrder: 代客下单、预售定金、拆单追溯
ALTER TABLE "sales_orders" ADD COLUMN "created_by_user_id" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN "deposit_amount" DECIMAL(12,2);
ALTER TABLE "sales_orders" ADD COLUMN "deposit_paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sales_orders" ADD COLUMN "split_from_order_id" TEXT;

-- ActionLog: 审计增强
ALTER TABLE "action_logs" ADD COLUMN "before_value" JSONB;
ALTER TABLE "action_logs" ADD COLUMN "after_value" JSONB;
ALTER TABLE "action_logs" ADD COLUMN "ip_address" TEXT;

-- ActionLog: 新增索引
CREATE INDEX "action_logs_action_idx" ON "action_logs"("action");
CREATE INDEX "action_logs_entity_type_entity_id_idx" ON "action_logs"("entity_type", "entity_id");

-- =============================================
-- 4. 新建表
-- =============================================

-- 客户专属价格
CREATE TABLE "customer_prices" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_prices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_prices_tenant_id_idx" ON "customer_prices"("tenant_id");
CREATE INDEX "customer_prices_customer_id_idx" ON "customer_prices"("customer_id");
CREATE INDEX "customer_prices_sku_id_idx" ON "customer_prices"("sku_id");
CREATE UNIQUE INDEX "customer_prices_customer_id_sku_id_tenant_id_key" ON "customer_prices"("customer_id", "sku_id", "tenant_id");
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SKU 多单位换算
CREATE TABLE "sku_units" (
    "id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unit_name" TEXT NOT NULL,
    "conversion_factor" INTEGER NOT NULL,
    "is_base_unit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sku_units_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sku_units_tenant_id_idx" ON "sku_units"("tenant_id");
CREATE INDEX "sku_units_sku_id_idx" ON "sku_units"("sku_id");
CREATE UNIQUE INDEX "sku_units_sku_id_unit_name_tenant_id_key" ON "sku_units"("sku_id", "unit_name", "tenant_id");
ALTER TABLE "sku_units" ADD CONSTRAINT "sku_units_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sku_units" ADD CONSTRAINT "sku_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 收款记录
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "received_by" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payment_records_tenant_id_idx" ON "payment_records"("tenant_id");
CREATE INDEX "payment_records_customer_id_idx" ON "payment_records"("customer_id");
CREATE INDEX "payment_records_received_at_idx" ON "payment_records"("received_at");
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 发票/账单
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "due_date" TIMESTAMP(3),
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");
CREATE UNIQUE INDEX "invoices_invoice_no_tenant_id_key" ON "invoices"("invoice_no", "tenant_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 审批申请
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "requester_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "order_id" TEXT,
    "current_value" TEXT,
    "requested_value" TEXT,
    "reason" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approval_requests_tenant_id_idx" ON "approval_requests"("tenant_id");
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX "approval_requests_requester_id_idx" ON "approval_requests"("requester_id");
CREATE INDEX "approval_requests_created_at_idx" ON "approval_requests"("created_at");
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 交接班记录
CREATE TABLE "shift_handovers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "shift_start" TIMESTAMP(3) NOT NULL,
    "shift_end" TIMESTAMP(3),
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "expected_cash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_cash" DECIMAL(12,2),
    "credit_sales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(12,2),
    "variance_reason" TEXT,
    "evidence_photos" JSONB,
    "status" "ShiftHandoverStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "shift_handovers_tenant_id_idx" ON "shift_handovers"("tenant_id");
CREATE INDEX "shift_handovers_operator_id_idx" ON "shift_handovers"("operator_id");
CREATE INDEX "shift_handovers_status_idx" ON "shift_handovers"("status");
CREATE INDEX "shift_handovers_created_at_idx" ON "shift_handovers"("created_at");
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 欠货池
CREATE TABLE "backorder_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "original_order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "backorder_qty" INTEGER NOT NULL,
    "fulfilled_qty" INTEGER NOT NULL DEFAULT 0,
    "status" "BackorderStatus" NOT NULL DEFAULT 'PENDING',
    "linked_shipment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "backorder_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "backorder_items_tenant_id_idx" ON "backorder_items"("tenant_id");
CREATE INDEX "backorder_items_original_order_id_idx" ON "backorder_items"("original_order_id");
CREATE INDEX "backorder_items_customer_id_idx" ON "backorder_items"("customer_id");
CREATE INDEX "backorder_items_sku_id_idx" ON "backorder_items"("sku_id");
CREATE INDEX "backorder_items_status_idx" ON "backorder_items"("status");
ALTER TABLE "backorder_items" ADD CONSTRAINT "backorder_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backorder_items" ADD CONSTRAINT "backorder_items_original_order_id_fkey" FOREIGN KEY ("original_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "backorder_items" ADD CONSTRAINT "backorder_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "backorder_items" ADD CONSTRAINT "backorder_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 盘点任务
CREATE TABLE "stock_count_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "status" "StockCountStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_count_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stock_count_tasks_tenant_id_idx" ON "stock_count_tasks"("tenant_id");
CREATE INDEX "stock_count_tasks_warehouse_id_idx" ON "stock_count_tasks"("warehouse_id");
CREATE INDEX "stock_count_tasks_assignee_id_idx" ON "stock_count_tasks"("assignee_id");
CREATE INDEX "stock_count_tasks_status_idx" ON "stock_count_tasks"("status");
ALTER TABLE "stock_count_tasks" ADD CONSTRAINT "stock_count_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_count_tasks" ADD CONSTRAINT "stock_count_tasks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 盘点明细
CREATE TABLE "stock_count_items" (
    "id" TEXT NOT NULL,
    "stock_count_task_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "bin_location_id" TEXT,
    "system_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER,
    "variance" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stock_count_items_stock_count_task_id_idx" ON "stock_count_items"("stock_count_task_id");
CREATE INDEX "stock_count_items_sku_id_idx" ON "stock_count_items"("sku_id");
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_stock_count_task_id_fkey" FOREIGN KEY ("stock_count_task_id") REFERENCES "stock_count_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_bin_location_id_fkey" FOREIGN KEY ("bin_location_id") REFERENCES "bin_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 收货质检
CREATE TABLE "receiving_inspections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "expected_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER NOT NULL,
    "damaged_qty" INTEGER NOT NULL DEFAULT 0,
    "discrepancy_type" "DiscrepancyType",
    "photos" JSONB,
    "notes" TEXT,
    "inspected_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receiving_inspections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "receiving_inspections_tenant_id_idx" ON "receiving_inspections"("tenant_id");
CREATE INDEX "receiving_inspections_receipt_id_idx" ON "receiving_inspections"("receipt_id");
CREATE INDEX "receiving_inspections_sku_id_idx" ON "receiving_inspections"("sku_id");
ALTER TABLE "receiving_inspections" ADD CONSTRAINT "receiving_inspections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receiving_inspections" ADD CONSTRAINT "receiving_inspections_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receiving_inspections" ADD CONSTRAINT "receiving_inspections_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 波次拣货
CREATE TABLE "pick_waves" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "wave_number" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "status" "PickWaveStatus" NOT NULL DEFAULT 'PENDING',
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "assignee_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pick_waves_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pick_waves_tenant_id_idx" ON "pick_waves"("tenant_id");
CREATE INDEX "pick_waves_warehouse_id_idx" ON "pick_waves"("warehouse_id");
CREATE INDEX "pick_waves_status_idx" ON "pick_waves"("status");
CREATE UNIQUE INDEX "pick_waves_wave_number_tenant_id_key" ON "pick_waves"("wave_number", "tenant_id");
ALTER TABLE "pick_waves" ADD CONSTRAINT "pick_waves_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pick_waves" ADD CONSTRAINT "pick_waves_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 波次拣货明细
CREATE TABLE "pick_wave_items" (
    "id" TEXT NOT NULL,
    "pick_wave_id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "bin_location_id" TEXT,
    "required_qty" INTEGER NOT NULL,
    "picked_qty" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pick_wave_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pick_wave_items_pick_wave_id_idx" ON "pick_wave_items"("pick_wave_id");
CREATE INDEX "pick_wave_items_sales_order_id_idx" ON "pick_wave_items"("sales_order_id");
CREATE INDEX "pick_wave_items_sku_id_idx" ON "pick_wave_items"("sku_id");
ALTER TABLE "pick_wave_items" ADD CONSTRAINT "pick_wave_items_pick_wave_id_fkey" FOREIGN KEY ("pick_wave_id") REFERENCES "pick_waves"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pick_wave_items" ADD CONSTRAINT "pick_wave_items_bin_location_id_fkey" FOREIGN KEY ("bin_location_id") REFERENCES "bin_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
