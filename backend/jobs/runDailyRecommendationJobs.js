/**
 * Gom job gợi ý / dữ liệu hành vi chạy một lần (đặt cron 1 lần/ngày).
 * Thứ tự: (1) rollup raw → user_behavior_daily (ngày UTC hôm qua)
 *        (2) dọn user_behavior quá hạn retention
 *        (3) tính lại product_similarity từ đơn hàng
 *
 * Chạy: từ thư mục backend — `npm run job:daily-recommendation`
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const node = process.execPath;
const prisma = new PrismaClient();
const DAILY_JOBS_LOCK_ID = 782_026_001;
const DAILY_JOBS_TIMEOUT_MS = 24 * 60 * 60 * 1000;

const steps = [
  { name: "Rollup user_behavior → daily", file: "rollupUserBehaviorDaily.js" },
  { name: "Prune user_behavior", file: "pruneUserBehavior.js" },
  { name: "Prune recommendation_log", file: "pruneRecommendationLog.js" },
  { name: "CF similarity", file: "computeProductSimilarity.js" },
  { name: "Offline user recommendations", file: "computeUserRecommendations.js" },
];

const main = async () => {
  await prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw`
      SELECT pg_try_advisory_xact_lock(${DAILY_JOBS_LOCK_ID}) AS acquired;
    `;

    if (!lock?.acquired) {
      console.log("[daily-jobs] Another instance is already running. Skipping.");
      return;
    }

    for (const { name, file } of steps) {
      console.log(`\n========== ${name} ==========\n`);
      const scriptPath = path.join(__dirname, file);
      const result = spawnSync(node, [scriptPath], {
        cwd: backendRoot,
        stdio: "inherit",
        env: process.env,
      });
      if (result.status !== 0) {
        throw new Error(
          `Step failed: ${name} (exit ${result.status}, signal ${result.signal})`
        );
      }
    }

    console.log("\n[daily-jobs] All steps finished OK.\n");
  }, { timeout: DAILY_JOBS_TIMEOUT_MS });
};

main()
  .catch((error) => {
    console.error("[daily-jobs]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
