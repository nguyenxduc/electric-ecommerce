import "dotenv/config";
import { prisma } from "../lib/db.js";
import { embedProducts } from "./embed-products.js";

const STARTUP_TASKS_LOCK_ID = 782_026_002;

const asBoolean = (value, fallback) => {
  if (value == null || String(value).trim() === "") return fallback;
  return !["0", "false", "no", "off"].includes(
    String(value).trim().toLowerCase()
  );
};

const hasEmbeddingApiKey = () =>
  Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

const setupSimilarity = async () => {
  console.log("[startup] Ensuring pg_trgm similarity support.");
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_products_description_gin_trgm
    ON products USING gin (description gin_trgm_ops);
  `;
};

const main = async () => {
  const [lock] = await prisma.$queryRaw`
    SELECT pg_try_advisory_lock(${STARTUP_TASKS_LOCK_ID}) AS acquired;
  `;

  if (!lock?.acquired) {
    console.log("[startup] Another instance is already running startup tasks.");
    return;
  }

  try {
    if (asBoolean(process.env.AUTO_SETUP_SIMILARITY, true)) {
      await setupSimilarity();
    }

    if (!asBoolean(process.env.AUTO_EMBED_PRODUCTS, true)) {
      console.log("[startup] Product embedding disabled by AUTO_EMBED_PRODUCTS.");
      return;
    }

    if (!hasEmbeddingApiKey()) {
      console.log("[startup] Skipping product embedding: Gemini API key is missing.");
      return;
    }

    await embedProducts();
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${STARTUP_TASKS_LOCK_ID});`;
  }
};

main()
  .catch((error) => {
    console.error("[startup] Startup tasks failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
