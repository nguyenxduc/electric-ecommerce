-- Demo features: shop vouchers, buyer<->seller chat, per-shop shipping fees,
-- return/refund requests. All additive; safe on both fresh and existing DBs.

-- Shop-scoped coupons (null = platform-wide)
ALTER TABLE "coupons" ADD COLUMN "shop_id" BIGINT;
CREATE INDEX "coupons_shop_id_idx" ON "coupons"("shop_id");
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Buyer<->seller chat (null = support chat with platform admin)
ALTER TABLE "chats" ADD COLUMN "shop_id" BIGINT;
CREATE INDEX "chats_shop_id_idx" ON "chats"("shop_id");
ALTER TABLE "chats" ADD CONSTRAINT "chats_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Per-shop shipping fees on orders
ALTER TABLE "orders" ADD COLUMN "shipping_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.0;
ALTER TABLE "order_groups" ADD COLUMN "shipping_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.0;

-- Return/refund requests
CREATE TABLE "return_requests" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "shop_id" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "return_requests_order_id_key" ON "return_requests"("order_id");
CREATE INDEX "return_requests_shop_id_status_idx" ON "return_requests"("shop_id", "status");
CREATE INDEX "return_requests_user_id_idx" ON "return_requests"("user_id");

ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
