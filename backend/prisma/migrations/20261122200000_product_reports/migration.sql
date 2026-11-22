-- CreateTable
CREATE TABLE "product_reports" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "reporter_id" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_by" BIGINT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_reports_status_created_at_idx" ON "product_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_reports_product_id_reporter_id_key" ON "product_reports"("product_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "product_reports" ADD CONSTRAINT "product_reports_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reports" ADD CONSTRAINT "product_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
