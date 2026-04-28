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

import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
const node = process.execPath;

const steps = [
  { name: "Rollup user_behavior → daily", file: "rollupUserBehaviorDaily.js" },
  { name: "Prune user_behavior", file: "pruneUserBehavior.js" },
  { name: "Prune recommendation_log", file: "pruneRecommendationLog.js" },
  { name: "CF similarity", file: "computeProductSimilarity.js" },
  { name: "Offline user recommendations", file: "computeUserRecommendations.js" },
];

for (const { name, file } of steps) {
  console.log(`\n========== ${name} ==========\n`);
  const scriptPath = path.join(__dirname, file);
  const r = spawnSync(node, [scriptPath], {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0 && r.status !== null) {
    console.error(`[daily-jobs] Step failed: ${name} (exit ${r.status})`);
    process.exit(r.status);
  }
}

console.log("\n[daily-jobs] All steps finished OK.\n");
