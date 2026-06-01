-- AlterTable
ALTER TABLE "users" ADD COLUMN "loyalty_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "segment" TEXT;
