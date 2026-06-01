import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["--prefix", "backend", "run", "dev"], {
    stdio: "inherit",
  }),
  spawn(npm, ["--prefix", "frontend", "run", "dev"], {
    stdio: "inherit",
  }),
];

let stopping = false;

const stopChildren = () => {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed) child.kill();
  }
};

for (const child of children) {
  child.on("error", (error) => {
    console.error("Unable to start application process:", error);
    stopChildren();
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`Application process stopped with code=${code} signal=${signal}.`);
      stopChildren();
      process.exitCode = code ?? 1;
    }
  });
}

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);
