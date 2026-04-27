/**
 * Dọn bảng user_behavior: xóa bản ghi có event_time cũ hơn N ngày (mặc định 90).
 * Chạy định kỳ qua cron / Task Scheduler: ví dụ mỗi đêm 3h — `npm run job:prune-user-behavior`
 *
 * Biến môi trường:
 *   USER_BEHAVIOR_RETENTION_DAYS  (mặc định 90, tối thiểu 7)
 */
import "dotenv/config";
import { prisma } from "../lib/db.js";

const DEFAULT_DAYS = 90;
const MIN_DAYS = 7;

function retentionDays() {
  const raw = process.env.USER_BEHAVIOR_RETENTION_DAYS;
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
    `[prune-user-behavior] Retention: ${days} days — deleting rows with event_time < ${cutoff.toISOString()}`
  );

  const result = await prisma.userBehavior.deleteMany({
    where: {
      event_time: { lt: cutoff },
    },
  });

  console.log(`[prune-user-behavior] Deleted ${result.count} row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
