/**
 * Gom user_behavior (raw) → user_behavior_daily theo 1 ngày (UTC).
 * Mặc định: hôm qua. Ghi đè (xóa + insert) cho ngày đó — idempotent nếu chạy lại.
 *
 *   USER_BEHAVIOR_ROLLUP_DAY=YYYY-MM-DD  (tuỳ chọn, UTC)
 *   npm run job:rollup-user-behavior-daily
 */
import "dotenv/config";
import { prisma } from "../lib/db.js";

/** Ngày cần rollup (UTC 00:00) */
function targetDayUtc() {
  const env = process.env.USER_BEHAVIOR_ROLLUP_DAY?.trim();
  if (env && /^\d{4}-\d{2}-\d{2}$/.test(env)) {
    return new Date(`${env}T00:00:00.000Z`);
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dayEndUtc(dayStart) {
  const e = new Date(dayStart);
  e.setUTCDate(e.getUTCDate() + 1);
  return e;
}

function visitorKey(userId, sessionId) {
  if (userId != null) return `user:${userId.toString()}`;
  return `sess:${sessionId && sessionId.length > 0 ? sessionId : "unknown"}`;
}

async function main() {
  const dayStart = targetDayUtc();
  const dayEnd = dayEndUtc(dayStart);
  const dayLabel = dayStart.toISOString().slice(0, 10);

  console.log(
    `[rollup-user-behavior-daily] UTC day=${dayLabel} window [${dayStart.toISOString()}, ${dayEnd.toISOString()})`
  );

  const groups = await prisma.userBehavior.groupBy({
    by: ["user_id", "session_id", "product_id", "event_type"],
    where: {
      event_time: { gte: dayStart, lt: dayEnd },
    },
    _count: { id: true },
  });

  const rows = groups.map((g) => ({
    visitor_key: visitorKey(g.user_id, g.session_id),
    product_id: g.product_id ?? BigInt(0),
    event_type: g.event_type,
    day: dayStart,
    event_count: g._count.id,
  }));

  await prisma.$transaction(async (tx) => {
    const del = await tx.userBehaviorDaily.deleteMany({
      where: { day: dayStart },
    });
    console.log(`[rollup-user-behavior-daily] Cleared ${del.count} existing row(s) for day ${dayLabel}`);

    if (rows.length === 0) {
      console.log("[rollup-user-behavior-daily] No raw events in window — nothing to insert.");
      return;
    }

    const chunk = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunk) {
      const part = rows.slice(i, i + chunk);
      const r = await tx.userBehaviorDaily.createMany({ data: part });
      inserted += r.count;
    }
    console.log(`[rollup-user-behavior-daily] Inserted ${inserted} aggregate row(s).`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
