-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "max_discount" DECIMAL(10,2),
ADD COLUMN     "starts_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "takedown_reason" TEXT,
ADD COLUMN     "taken_down_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspend_reason" TEXT,
ADD COLUMN     "suspended_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "ward" TEXT,
    "street" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_claims" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "coupon_id" BIGINT NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");

-- CreateIndex
CREATE INDEX "coupon_claims_coupon_id_idx" ON "coupon_claims"("coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_claims_user_id_coupon_id_key" ON "coupon_claims"("user_id", "coupon_id");

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_claims" ADD CONSTRAINT "coupon_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_claims" ADD CONSTRAINT "coupon_claims_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

