-- Chạy tay nếu chưa áp qua Prisma migrate/db push (PostgreSQL).
-- Giúp DELETE theo event_time nhanh hơn.

CREATE INDEX IF NOT EXISTS "user_behavior_event_time_idx"
  ON "user_behavior" ("event_time");
