-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'ARRIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscrepancyType" AS ENUM ('SHORT', 'OVER', 'DAMAGED', 'WRONG_ITEM');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER', 'LOCK', 'UNLOCK', 'RETURN');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "country" TEXT,
    "payment_terms" TEXT,
    "lead_time_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_locations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "zone" TEXT,
    "aisle" TEXT,
    "shelf" TEXT,
    "position" TEXT,
    "barcode" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "ordered_at" TIMESTAMP(3),
    "expected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "received_qty" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "container_no" TEXT,
    "vessel_name" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "etd" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "atd" TIMESTAMP(3),
    "ata" TIMESTAMP(3),
    "port_of_loading" TEXT,
    "port_of_discharge" TEXT,
    "shipping_cost" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_list_items" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "carton_no" TEXT NOT NULL,
    "sku_code" TEXT NOT NULL,
    "sku_name" TEXT,
    "quantity" INTEGER NOT NULL,
    "gross_weight" DECIMAL(8,3),
    "net_weight" DECIMAL(8,3),
    "cbm" DECIMAL(8,4),
    "barcode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packing_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipts" (
    "id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "received_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_items" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "po_item_id" TEXT NOT NULL,
    "expected_qty" INTEGER NOT NULL,
    "received_qty" INTEGER NOT NULL,
    "damaged_qty" INTEGER NOT NULL DEFAULT 0,
    "discrepancy_type" "DiscrepancyType",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "bin_location_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "locked_qty" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledgers" (
    "id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "notes" TEXT,
    "operator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_tenant_id_key" ON "suppliers"("code", "tenant_id");

-- CreateIndex
CREATE INDEX "warehouses_tenant_id_idx" ON "warehouses"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_tenant_id_key" ON "warehouses"("code", "tenant_id");

-- CreateIndex
CREATE INDEX "bin_locations_warehouse_id_idx" ON "bin_locations"("warehouse_id");

-- CreateIndex
CREATE INDEX "bin_locations_tenant_id_idx" ON "bin_locations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bin_locations_code_tenant_id_key" ON "bin_locations"("code", "tenant_id");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_order_number_tenant_id_key" ON "purchase_orders"("order_number", "tenant_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "shipments_purchase_order_id_idx" ON "shipments"("purchase_order_id");

-- CreateIndex
CREATE INDEX "shipments_tenant_id_idx" ON "shipments"("tenant_id");

-- CreateIndex
CREATE INDEX "packing_list_items_shipment_id_idx" ON "packing_list_items"("shipment_id");

-- CreateIndex
CREATE INDEX "purchase_receipts_purchase_order_id_idx" ON "purchase_receipts"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_receipts_tenant_id_idx" ON "purchase_receipts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_receipt_number_tenant_id_key" ON "purchase_receipts"("receipt_number", "tenant_id");

-- CreateIndex
CREATE INDEX "receipt_items_receipt_id_idx" ON "receipt_items"("receipt_id");

-- CreateIndex
CREATE INDEX "inventory_items_tenant_id_idx" ON "inventory_items"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_items_warehouse_id_idx" ON "inventory_items"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sku_id_warehouse_id_bin_location_id_tenant__key" ON "inventory_items"("sku_id", "warehouse_id", "bin_location_id", "tenant_id");

-- CreateIndex
CREATE INDEX "inventory_ledgers_sku_id_idx" ON "inventory_ledgers"("sku_id");

-- CreateIndex
CREATE INDEX "inventory_ledgers_warehouse_id_idx" ON "inventory_ledgers"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_ledgers_tenant_id_idx" ON "inventory_ledgers"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_ledgers_created_at_idx" ON "inventory_ledgers"("created_at");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_locations" ADD CONSTRAINT "bin_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_locations" ADD CONSTRAINT "bin_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_list_items" ADD CONSTRAINT "packing_list_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_po_item_id_fkey" FOREIGN KEY ("po_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_bin_location_id_fkey" FOREIGN KEY ("bin_location_id") REFERENCES "bin_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledgers" ADD CONSTRAINT "inventory_ledgers_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledgers" ADD CONSTRAINT "inventory_ledgers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledgers" ADD CONSTRAINT "inventory_ledgers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
