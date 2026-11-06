-- Postgres unique constraints treat every NULL as distinct from every other
-- NULL, so the existing @@unique([filter_key_id, value, category_id]) on
-- filter_options never deduped "global" options (category_id IS NULL) - two
-- rows with the same filter_key_id/value and no category could both be
-- inserted. Prisma's schema DSL can't express a partial (WHERE-clause)
-- unique index, so this constraint lives only here, not in schema.prisma.
--
-- Run manually against any environment with pre-existing duplicate global
-- options before applying - CREATE UNIQUE INDEX will fail if duplicates
-- already exist:
--   SELECT filter_key_id, value, COUNT(*) FROM filter_options
--   WHERE category_id IS NULL AND deleted_at IS NULL
--   GROUP BY filter_key_id, value HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "filter_options_global_unique"
  ON "filter_options" ("filter_key_id", "value")
  WHERE "category_id" IS NULL;
