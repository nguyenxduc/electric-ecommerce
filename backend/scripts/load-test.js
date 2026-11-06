/**
 * Do tai nhe cho ba endpoint doc nhieu nhat — sinh bao cao docs/load-test.md.
 *
 *   npm run eval:load
 *
 * Yeu cau: backend dang chay va da seed (co san pham, co category).
 *
 * QUAN TRONG: apiLimiter (backend/middleware/rateLimit.middleware.js) chan
 * toi da 5000 req/15 phut/IP cho toan bo /api. Luu luong cua chinh script nay
 * (CONCURRENCY x (ROUNDS + WARMUP) x 3 endpoint, mac dinh ~200x6x3=3600+) co
 * the cham nguong do. Neu dinh 429 thi dang do chinh rate limiter chu khong
 * phai API nua — script dung lai ngay, khong am tham chay tiep.
 */
import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { percentile } from "../lib/stats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL || "http://localhost:3000/api";

const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY) || 200;
const ROUNDS = Number(process.env.LOAD_ROUNDS) || 5;
const WARMUP = Number(process.env.LOAD_WARMUP ?? 1);

const hit = async (p) => {
  const started = Date.now();
  const res = await fetch(API + p);
  return { status: res.status, latency: Date.now() - started };
};

const assertNo429 = (results) => {
  if (results.some((r) => r.status === 429)) {
    throw new Error(
      "Nhan 429 (Too Many Requests) — ket qua do bi vo hieu vi da cham apiLimiter. " +
        "Khoi dong lai backend voi RATE_LIMIT_ENABLED=0 roi chay lai."
    );
  }
};

const runRounds = async (label, p) => {
  const measured = [];
  for (let round = 0; round < WARMUP + ROUNDS; round++) {
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => hit(p))
    );
    assertNo429(results);
    if (round >= WARMUP) measured.push(...results);
    process.stdout.write(round < WARMUP ? "w" : ".");
  }
  process.stdout.write("\n");

  const latencies = measured.map((r) => r.latency);
  return {
    label,
    n: measured.length,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies.length ? Math.max(...latencies) : 0,
    non2xx: measured.filter((r) => r.status < 200 || r.status >= 300).length,
    fiveXx: measured.filter((r) => r.status >= 500).length,
  };
};

const main = async () => {
  console.log(`Load test — concurrency=${CONCURRENCY} rounds=${ROUNDS} warmup=${WARMUP}`);
  console.log(`API: ${API}\n`);

  const prime = await fetch(API + "/products?limit=20").then((r) => r.json());
  const productId = prime?.products?.[0]?.id;
  if (!productId) {
    throw new Error("Khong lay duoc id san pham tu GET /products?limit=20. Backend da seed chua?");
  }

  console.log("1/3  GET /api/products?limit=20");
  const list = await runRounds("GET /api/products?limit=20", "/products?limit=20");
  console.log("2/3  GET /api/products/:id");
  const byId = await runRounds("GET /api/products/:id", `/products/${productId}`);
  console.log("3/3  GET /api/categories");
  const categories = await runRounds("GET /api/categories", "/categories");

  const rows = [list, byId, categories];
  const command = `LOAD_CONCURRENCY=${CONCURRENCY} LOAD_ROUNDS=${ROUNDS} LOAD_WARMUP=${WARMUP} npm run eval:load`;
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");

  const md = [
    "# Ket qua do tai (load test)",
    "",
    `> Sinh tu \`npm run eval:load\` luc ${now}.`,
    "",
    "Đo trên máy dev, không phải môi trường production.",
    "",
    `May do: ${os.platform()}, ${os.cpus().length} CPU.`,
    `Lenh da chay: \`${command}\``,
    "",
    "| endpoint | n | p50 | p95 | p99 | max | non-2xx | 5xx |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.label} | ${r.n} | ${r.p50}ms | ${r.p95}ms | ${r.p99}ms | ${r.max}ms | ${r.non2xx} | ${r.fiveXx} |`
    ),
    "",
    ...rows.map(
      (r) =>
        `- ${r.label}: p95 ${r.p95}ms — ${
          r.p95 < 500 ? "đạt < 500ms" : `chưa đạt (giá trị thật: ${r.p95}ms)`
        }`
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(__dirname, "..", "docs", "load-test.md"), md);
  console.log("\nDa ghi bao cao: docs/load-test.md");
};

main().catch((err) => {
  console.error("\nLoad test dung lai:", err.message);
  process.exit(1);
});
