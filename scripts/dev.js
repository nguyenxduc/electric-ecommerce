import { spawn } from "node:child_process";

// Chạy qua shell: Node >=18.20.2 cấm spawn npm.cmd trực tiếp trên Windows (EINVAL).
// `app` chỉ là hằng "backend"/"frontend", không có input ngoài đi vào shell.
// nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true
const run = (app) => spawn(`npm --prefix ${app} run dev`, { stdio: "inherit", shell: true });
const children = [run("backend"), run("frontend")];

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
