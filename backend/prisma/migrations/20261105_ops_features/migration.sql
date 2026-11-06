-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "variant_id" BIGINT;

-- AlterTable
ALTER TABLE "order_groups" ADD COLUMN     "client_ip" TEXT,
ADD COLUMN     "device_id" TEXT,
ADD COLUMN     "invoice_request" JSONB,
ADD COLUMN     "risk_score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "variant_id" BIGINT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "weight_grams" INTEGER NOT NULL DEFAULT 500;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "client_ip" TEXT,
ADD COLUMN     "device_id" TEXT;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "pickup_address" TEXT,
ADD COLUMN     "pickup_district" TEXT,
ADD COLUMN     "pickup_province" TEXT,
ADD COLUMN     "pickup_ward" TEXT,
ADD COLUMN     "tax_code" TEXT,
ADD COLUMN     "tax_entity_type" TEXT NOT NULL DEFAULT 'household';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "price_delta" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "carrier" TEXT NOT NULL,
    "tracking_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "fee_vnd" INTEGER NOT NULL DEFAULT 0,
    "cod_amount_vnd" INTEGER NOT NULL DEFAULT 0,
    "weight_grams" INTEGER NOT NULL DEFAULT 0,
    "label_url" TEXT,
    "raw" JSONB DEFAULT '{}',
    "cod_collected_at" TIMESTAMP(3),
    "cod_settlement_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" BIGSERIAL NOT NULL,
    "shipment_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cod_settlements" (
    "id" BIGSERIAL NOT NULL,
    "carrier" TEXT NOT NULL,
    "reference" TEXT,
    "expected_amount_vnd" INTEGER NOT NULL,
    "received_amount_vnd" INTEGER NOT NULL,
    "difference_vnd" INTEGER NOT NULL,
    "note" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cod_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'verify_phone',
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_flags" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_by" BIGINT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "shop_id" BIGINT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'internal',
    "provider_ref" TEXT,
    "seller" JSONB NOT NULL,
    "buyer" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vat_rate" DECIMAL(5,4) NOT NULL,
    "vat_amount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'issued',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_withholdings" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "shop_id" BIGINT NOT NULL,
    "period" TEXT NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "vat_rate" DECIMAL(5,4) NOT NULL,
    "vat_amount" DECIMAL(12,2) NOT NULL,
    "pit_rate" DECIMAL(5,4) NOT NULL,
    "pit_amount" DECIMAL(12,2) NOT NULL,
    "reversed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_withholdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_code_key" ON "shipments"("tracking_code");

-- CreateIndex
CREATE INDEX "shipments_status_updated_at_idx" ON "shipments"("status", "updated_at");

-- CreateIndex
CREATE INDEX "shipments_carrier_cod_collected_at_idx" ON "shipments"("carrier", "cod_collected_at");

-- CreateIndex
CREATE INDEX "shipment_events_shipment_id_occurred_at_idx" ON "shipment_events"("shipment_id", "occurred_at");

-- CreateIndex
CREATE INDEX "cod_settlements_carrier_created_at_idx" ON "cod_settlements"("carrier", "created_at");

-- CreateIndex
CREATE INDEX "otp_codes_phone_created_at_idx" ON "otp_codes"("phone", "created_at");

-- CreateIndex
CREATE INDEX "otp_codes_user_id_created_at_idx" ON "otp_codes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "fraud_flags_status_created_at_idx" ON "fraud_flags"("status", "created_at");

-- CreateIndex
CREATE INDEX "fraud_flags_user_id_idx" ON "fraud_flags"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_flags_type_subject_subject_id_key" ON "fraud_flags"("type", "subject", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_shop_id_issued_at_idx" ON "invoices"("shop_id", "issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "tax_withholdings_order_id_key" ON "tax_withholdings"("order_id");

-- CreateIndex
CREATE INDEX "tax_withholdings_shop_id_period_idx" ON "tax_withholdings"("shop_id", "period");

-- CreateIndex
CREATE INDEX "tax_withholdings_period_idx" ON "tax_withholdings"("period");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_cod_settlement_id_fkey" FOREIGN KEY ("cod_settlement_id") REFERENCES "cod_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_withholdings" ADD CONSTRAINT "tax_withholdings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_withholdings" ADD CONSTRAINT "tax_withholdings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- So hoa don tang dan, khong trung ke ca khi nhieu request cung luc.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
