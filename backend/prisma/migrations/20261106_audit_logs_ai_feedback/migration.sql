-- Hai bang nay co trong schema tu lau nhung chua migration nao tao: DB dev co
-- san do drift, DB moi (CI, production) thi audit log va feedback AI ghi that bai.
-- IF NOT EXISTS de DB dev da co bang khong loi.
-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" BIGINT,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_feedback" (
    "id" BIGSERIAL NOT NULL,
    "ai_message_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_feedback_ai_message_id_idx" ON "ai_feedback"("ai_message_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_feedback_user_id_idx" ON "ai_feedback"("user_id");

