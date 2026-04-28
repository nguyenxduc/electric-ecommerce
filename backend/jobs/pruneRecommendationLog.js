/**
 * Prune recommendation_log rows older than N days (default 90).
 * Suggested schedule: daily at off-peak hours.
 *
 * Env:
 *   RECOMMENDATION_LOG_RETENTION_DAYS (default 90, min 7)
 */
import "dotenv/config";
import { prisma } from "../lib/db.js";

const DEFAULT_DAYS = 90;
const MIN_DAYS = 7;

function retentionDays() {
  const raw = process.env.RECOMMENDATION_LOG_RETENTION_DAYS;
  if (raw == null || String(raw).trim() === "") return DEFAULT_DAYS;
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < MIN_DAYS) return MIN_DAYS;
  return Math.min(n, 3650);
}

async function main() {
  const days = retentionDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  console.log(
    `[prune-recommendation-log] Retention: ${days} days — deleting rows with created_at < ${cutoff.toISOString()}`
  );

  const result = await prisma.recommendationLog.deleteMany({
    where: {
      created_at: { lt: cutoff },
    },
  });

  console.log(`[prune-recommendation-log] Deleted ${result.count} row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
