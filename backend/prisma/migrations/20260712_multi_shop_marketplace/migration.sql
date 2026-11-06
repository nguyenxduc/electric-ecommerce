-- Multi-shop marketplace refactor:
-- 1. New "shops" table (one shop per user).
-- 2. New "order_groups" table (one buyer checkout -> N per-shop orders).
-- 3. products.shop_id, orders.shop_id, orders.order_group_id, payments.order_group_id.
-- 4. Conditional in-place backfill for databases that already contain data
--    (fresh databases skip the backfill blocks as no-ops), then NOT NULL.
-- 5. payments.order_id is dropped: payments now attach to the whole checkout.

-- CreateTable
CREATE TABLE "shops" (
    "id" BIGSERIAL NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "shipping_fee_override" DECIMAL(10,2),
    "free_shipping_threshold_override" DECIMAL(10,2),
    "approved_at" TIMESTAMP(3),
    "approved_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_groups" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "group_number" TEXT NOT NULL,
    "subtotal_amount" DECIMAL(10,2) NOT NULL,
    "tier_discount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "coupon_discount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "coupon_id" BIGINT,
    "payment_method" TEXT,
    "shipping_address" JSONB,
    "receiver_name" TEXT,
    "receiver_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "order_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_owner_id_key" ON "shops"("owner_id");
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");
CREATE INDEX "shops_status_idx" ON "shops"("status");
CREATE INDEX "shops_slug_idx" ON "shops"("slug");
CREATE UNIQUE INDEX "order_groups_group_number_key" ON "order_groups"("group_number");
CREATE INDEX "order_groups_user_id_created_at_idx" ON "order_groups"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_groups" ADD CONSTRAINT "order_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_groups" ADD CONSTRAINT "order_groups_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable (nullable first; constrained after backfill)
ALTER TABLE "products" ADD COLUMN "shop_id" BIGINT;
ALTER TABLE "orders" ADD COLUMN "shop_id" BIGINT;
ALTER TABLE "orders" ADD COLUMN "order_group_id" BIGINT;
ALTER TABLE "payments" ADD COLUMN "order_group_id" BIGINT;

-- Backfill: only runs when pre-existing rows need a home. Fresh databases
-- (migrate deploy before seed) skip every branch.
DO $$
DECLARE
  default_shop_id BIGINT;
  default_owner_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM "products" WHERE "shop_id" IS NULL)
     OR EXISTS (SELECT 1 FROM "orders" WHERE "shop_id" IS NULL) THEN

    -- Owner for the legacy catalog: prefer an admin, else any user.
    SELECT "id" INTO default_owner_id FROM "users" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1;
    IF default_owner_id IS NULL THEN
      SELECT "id" INTO default_owner_id FROM "users" ORDER BY "id" LIMIT 1;
    END IF;

    IF default_owner_id IS NULL THEN
      RAISE EXCEPTION 'Cannot backfill shop_id: products/orders exist but no users found to own the default shop';
    END IF;

    INSERT INTO "shops" ("owner_id", "name", "slug", "description", "status", "approved_at", "updated_at")
    VALUES (default_owner_id, 'Default Store', 'default-store', 'Legacy single-store catalog', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("owner_id") DO UPDATE SET "updated_at" = CURRENT_TIMESTAMP
    RETURNING "id" INTO default_shop_id;

    UPDATE "products" SET "shop_id" = default_shop_id WHERE "shop_id" IS NULL;
    UPDATE "orders" SET "shop_id" = default_shop_id WHERE "shop_id" IS NULL;
  END IF;

  -- One legacy OrderGroup per pre-existing order (1:1 wrap).
  IF EXISTS (SELECT 1 FROM "orders" WHERE "order_group_id" IS NULL) THEN
    WITH new_groups AS (
      INSERT INTO "order_groups" (
        "user_id", "group_number", "subtotal_amount", "total_amount",
        "coupon_id", "payment_method", "shipping_address",
        "receiver_name", "receiver_phone", "created_at", "updated_at"
      )
      SELECT
        o."user_id",
        'GRP-LEGACY-' || o."id",
        COALESCE(o."total_amount", 0),
        COALESCE(o."total_amount", 0),
        o."coupon_id",
        o."payment_method",
        o."shipping_address",
        o."receiver_name",
        o."receiver_phone",
        o."created_at",
        CURRENT_TIMESTAMP
      FROM "orders" o
      WHERE o."order_group_id" IS NULL
      RETURNING "id", "group_number"
    )
    UPDATE "orders" o
    SET "order_group_id" = g."id"
    FROM new_groups g
    WHERE g."group_number" = 'GRP-LEGACY-' || o."id";
  END IF;

  -- Point payments at their order's new group.
  UPDATE "payments" p
  SET "order_group_id" = o."order_group_id"
  FROM "orders" o
  WHERE p."order_id" = o."id" AND p."order_group_id" IS NULL;
END $$;

-- Enforce NOT NULL now that every row has a value.
ALTER TABLE "products" ALTER COLUMN "shop_id" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "shop_id" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "order_group_id" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "order_group_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "products_shop_id_idx" ON "products"("shop_id");
CREATE INDEX "orders_shop_id_idx" ON "orders"("shop_id");
CREATE INDEX "orders_order_group_id_idx" ON "orders"("order_group_id");
CREATE INDEX "payments_order_group_id_idx" ON "payments"("order_group_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_group_id_fkey" FOREIGN KEY ("order_group_id") REFERENCES "order_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_group_id_fkey" FOREIGN KEY ("order_group_id") REFERENCES "order_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop legacy payments.order_id
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_order_id_fkey";
DROP INDEX IF EXISTS "payments_order_id_idx";
ALTER TABLE "payments" DROP COLUMN "order_id";
