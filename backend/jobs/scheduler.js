import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JOBS } from "./registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const asBoolean = (value, fallback) => {
  if (value == null || String(value).trim() === "") return fallback;
  return !["0", "false", "no", "off"].includes(
    String(value).trim().toLowerCase()
  );
};

// Moi job mot co "dang chay": chu ky toi ma lan truoc chua xong thi bo qua,
// khong chong hai process cung lam mot viec.
const running = new Map();

const runJob = (job, reason) => {
  if (running.get(job.name)) {
    console.log(`[scheduler] Skip ${job.name} (${reason}): still running.`);
    return;
  }
  const script = path.join(__dirname, job.file);
  if (!fs.existsSync(script)) {
    console.error(`[scheduler] ${job.name}: missing ${job.file}, skipped.`);
    return;
  }

  const child = spawn(process.execPath, [script], {
    cwd: path.join(__dirname, ".."),
    env: process.env,
    stdio: "inherit",
  });
  running.set(job.name, child);

  child.on("error", (error) => {
    console.error(`[scheduler] ${job.name}: unable to start:`, error);
    running.delete(job.name);
  });
  child.on("exit", (code, signal) => {
    if (code !== 0) {
      console.error(`[scheduler] ${job.name} exited code=${code} signal=${signal}.`);
    }
    running.delete(job.name);
  });
};

const timers = [];

export const startScheduler = () => {
  for (const job of JOBS) {
    if (!asBoolean(process.env[`${job.envKey}_ENABLED`], true)) {
      console.log(`[scheduler] ${job.name} disabled by ${job.envKey}_ENABLED.`);
      continue;
    }
    console.log(`[scheduler] ${job.name}: every ${job.everyMinutes} min.`);
    if (job.runOnStart) runJob(job, "startup");
    const timer = setInterval(
      () => runJob(job, "interval"),
      job.everyMinutes * 60 * 1000
    );
    timer.unref();
    timers.push(timer);
  }
};

// Dung len lich moi, doi job con dang chay xong toi da timeoutMs roi kill.
export const stopScheduler = async (timeoutMs = 25_000) => {
  timers.forEach(clearInterval);
  const deadline = Date.now() + timeoutMs;
  while (running.size && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const child of running.values()) child.kill("SIGTERM");
};

// API process: JOBS_IN_API=0 khi da chay worker rieng (jobs/worker.js), de
// job khong chiem CPU cua process phuc vu request.
export const startDailyJobsScheduler = () => {
  if (!asBoolean(process.env.JOBS_IN_API, true)) {
    console.log("[scheduler] Jobs run in the worker process (JOBS_IN_API=0).");
    return;
  }
  startScheduler();
};
