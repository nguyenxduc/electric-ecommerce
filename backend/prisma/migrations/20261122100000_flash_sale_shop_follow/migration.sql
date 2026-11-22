-- AlterTable
ALTER TABLE "products" ADD COLUMN     "flash_discount" DECIMAL(10,2),
ADD COLUMN     "flash_ends_at" TIMESTAMP(3),
ADD COLUMN     "flash_starts_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "shop_follows" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "shop_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_follows_shop_id_idx" ON "shop_follows"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_follows_user_id_shop_id_key" ON "shop_follows"("user_id", "shop_id");

-- CreateIndex
CREATE INDEX "products_flash_ends_at_idx" ON "products"("flash_ends_at");

-- AddForeignKey
ALTER TABLE "shop_follows" ADD CONSTRAINT "shop_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_follows" ADD CONSTRAINT "shop_follows_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
