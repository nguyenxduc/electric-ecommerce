import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dailyJobsScript = path.join(__dirname, "runDailyRecommendationJobs.js");

const DEFAULT_INTERVAL_HOURS = 24;
const MIN_INTERVAL_HOURS = 1;

const asBoolean = (value, fallback) => {
  if (value == null || String(value).trim() === "") return fallback;
  return !["0", "false", "no", "off"].includes(
    String(value).trim().toLowerCase()
  );
};

const intervalMs = () => {
  const parsed = Number(process.env.DAILY_JOBS_INTERVAL_HOURS);
  const hours =
    Number.isFinite(parsed) && parsed >= MIN_INTERVAL_HOURS
      ? parsed
      : DEFAULT_INTERVAL_HOURS;
  return hours * 60 * 60 * 1000;
};

let runningChild = null;

const runDailyJobs = (reason) => {
  if (runningChild) {
    console.log(`[daily-jobs-scheduler] Skipping ${reason}: jobs are still running.`);
    return;
  }

  console.log(`[daily-jobs-scheduler] Starting daily jobs (${reason}).`);
  runningChild = spawn(process.execPath, [dailyJobsScript], {
    cwd: path.join(__dirname, ".."),
    env: process.env,
    stdio: "inherit",
  });

  runningChild.on("error", (error) => {
    console.error("[daily-jobs-scheduler] Unable to start daily jobs:", error);
    runningChild = null;
  });

  runningChild.on("exit", (code, signal) => {
    if (code === 0) {
      console.log("[daily-jobs-scheduler] Daily jobs finished successfully.");
    } else {
      console.error(
        `[daily-jobs-scheduler] Daily jobs stopped with code=${code} signal=${signal}.`
      );
    }
    runningChild = null;
  });
};

export const startDailyJobsScheduler = () => {
  if (!asBoolean(process.env.DAILY_JOBS_ENABLED, true)) {
    console.log("[daily-jobs-scheduler] Disabled by DAILY_JOBS_ENABLED.");
    return;
  }

  const delay = intervalMs();
  console.log(
    `[daily-jobs-scheduler] Enabled. Interval: ${delay / (60 * 60 * 1000)} hour(s).`
  );

  if (asBoolean(process.env.DAILY_JOBS_RUN_ON_START, true)) {
    runDailyJobs("server startup");
  }

  const timer = setInterval(() => runDailyJobs("scheduled interval"), delay);
  timer.unref();
};
