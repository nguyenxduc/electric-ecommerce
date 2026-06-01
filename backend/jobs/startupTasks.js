import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const startupTasksScript = path.join(
  __dirname,
  "..",
  "scripts",
  "run-startup-tasks.js"
);

let runningChild = null;

export const startStartupTasks = () => {
  if (runningChild) return;

  console.log("[startup] Starting application bootstrap tasks.");
  runningChild = spawn(process.execPath, [startupTasksScript], {
    cwd: path.join(__dirname, ".."),
    env: process.env,
    stdio: "inherit",
  });

  runningChild.on("error", (error) => {
    console.error("[startup] Unable to start bootstrap tasks:", error);
    runningChild = null;
  });

  runningChild.on("exit", (code, signal) => {
    if (code === 0) {
      console.log("[startup] Bootstrap tasks finished successfully.");
    } else {
      console.error(
        `[startup] Bootstrap tasks stopped with code=${code} signal=${signal}.`
      );
    }
    runningChild = null;
  });
};
