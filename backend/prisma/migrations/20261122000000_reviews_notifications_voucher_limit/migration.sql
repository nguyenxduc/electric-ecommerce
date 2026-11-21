-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "per_user_limit" INTEGER;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "seller_reply" TEXT,
ADD COLUMN     "seller_reply_at" TIMESTAMP(3);

