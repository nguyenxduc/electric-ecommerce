-- CreateTable
CREATE TABLE "user_behavior" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "session_id" TEXT,
    "product_id" BIGINT,
    "event_type" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "user_behavior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_behavior_daily" (
    "id" BIGSERIAL NOT NULL,
    "visitor_key" TEXT NOT NULL,
    "product_id" BIGINT NOT NULL DEFAULT 0,
    "event_type" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_behavior_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_similarity" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "similar_product_id" BIGINT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_similarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "session_id" TEXT,
    "strategy" TEXT NOT NULL,
    "product_ids" BIGINT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_behavior_user_id_event_time_idx" ON "user_behavior"("user_id", "event_time");

-- CreateIndex
CREATE INDEX "user_behavior_product_id_event_time_idx" ON "user_behavior"("product_id", "event_time");

-- CreateIndex
CREATE INDEX "user_behavior_event_type_event_time_idx" ON "user_behavior"("event_type", "event_time");

-- CreateIndex
CREATE INDEX "user_behavior_event_time_idx" ON "user_behavior"("event_time");

-- CreateIndex
CREATE UNIQUE INDEX "user_behavior_daily_visitor_key_product_id_event_type_day_key" ON "user_behavior_daily"("visitor_key", "product_id", "event_type", "day");

-- CreateIndex
CREATE INDEX "user_behavior_daily_day_idx" ON "user_behavior_daily"("day");

-- CreateIndex
CREATE INDEX "user_behavior_daily_visitor_key_day_idx" ON "user_behavior_daily"("visitor_key", "day");

-- CreateIndex
CREATE INDEX "user_behavior_daily_product_id_day_idx" ON "user_behavior_daily"("product_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "product_similarity_product_id_similar_product_id_key" ON "product_similarity"("product_id", "similar_product_id");

-- CreateIndex
CREATE INDEX "product_similarity_product_id_idx" ON "product_similarity"("product_id");

-- CreateIndex
CREATE INDEX "recommendation_log_user_id_created_at_idx" ON "recommendation_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "recommendation_log_session_id_created_at_idx" ON "recommendation_log"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "recommendation_log_strategy_created_at_idx" ON "recommendation_log"("strategy", "created_at");
