-- Backend Part 3: UserRole, ShipmentStatus, notification_events, cashbook
-- Created: 2026-03-17T12:00:00

-- UserRole: OPERATIONS, SALES_SUPERVISOR
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SALES_SUPERVISOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OPERATIONS';

-- ShipmentStatus: ARRIVED_PORT, AT_WAREHOUSE_PENDING_UNLOAD, UNLOADING_COUNTING_RECEIVING
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'ARRIVED_PORT';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'AT_WAREHOUSE_PENDING_UNLOAD';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'UNLOADING_COUNTING_RECEIVING';

-- notification_events
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "payload" JSONB,
    "target_user_id" TEXT,
    "target_customer_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_events_tenant_id_idx" ON "notification_events"("tenant_id");
CREATE INDEX "notification_events_target_user_id_idx" ON "notification_events"("target_user_id");
CREATE INDEX "notification_events_target_customer_id_idx" ON "notification_events"("target_customer_id");
CREATE INDEX "notification_events_created_at_idx" ON "notification_events"("created_at");
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CashbookSessionStatus enum
CREATE TYPE "CashbookSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CashbookTransactionType enum
CREATE TYPE "CashbookTransactionType" AS ENUM ('IN', 'OUT');

-- cashbook_sessions
CREATE TABLE "cashbook_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "opening_cash" DECIMAL(12,2),
    "closing_cash" DECIMAL(12,2),
    "status" "CashbookSessionStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cashbook_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cashbook_sessions_tenant_id_idx" ON "cashbook_sessions"("tenant_id");
CREATE INDEX "cashbook_sessions_operator_id_idx" ON "cashbook_sessions"("operator_id");
CREATE INDEX "cashbook_sessions_opened_at_idx" ON "cashbook_sessions"("opened_at");
ALTER TABLE "cashbook_sessions" ADD CONSTRAINT "cashbook_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- cashbook_transactions
CREATE TABLE "cashbook_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" "CashbookTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cashbook_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cashbook_transactions_tenant_id_idx" ON "cashbook_transactions"("tenant_id");
CREATE INDEX "cashbook_transactions_session_id_idx" ON "cashbook_transactions"("session_id");
CREATE INDEX "cashbook_transactions_created_at_idx" ON "cashbook_transactions"("created_at");
ALTER TABLE "cashbook_transactions" ADD CONSTRAINT "cashbook_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cashbook_transactions" ADD CONSTRAINT "cashbook_transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cashbook_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
