// Process rieng chi chay scheduler (khong HTTP). Dung cung JOBS_IN_API=0 o API.
// Startup task (embedding...) van nam o API, khong chay o day.
import "dotenv/config";
import { startScheduler, stopScheduler } from "./scheduler.js";

console.log(`[worker] started pid=${process.pid}`);
startScheduler();

// Giu process song: timer cua scheduler da unref nen can mot handle rieng.
const keepAlive = setInterval(() => {}, 1 << 30);

let stopping = false;
const shutdown = async (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`[worker] ${signal}: stop scheduling, waiting for running jobs.`);
  clearInterval(keepAlive);
  await stopScheduler(8000);
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
