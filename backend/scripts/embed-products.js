import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import { ProxyAgent, setGlobalDispatcher } from "undici";

import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const EMBED_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const BATCH_SIZE = 25;
const AI_PROXY_URL =
  process.env.AI_HTTP_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  "";

if (AI_PROXY_URL) {
  setGlobalDispatcher(new ProxyAgent(AI_PROXY_URL));
}

const buildContent = (p) => {
  const specs = Array.isArray(p.specs_detail) ? p.specs_detail : [];
  const specsText = specs
    .map((s) => `${s.label ?? ""}: ${JSON.stringify(s.value ?? "")}`)
    .join(" | ");
  const price = p.price ? p.price.toString() : "";
  return `Tên: ${p.name} | Giá: ${price} | Specs: ${specsText}`;
};

async function main() {
  if (!EMBED_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY)");
  }

  const embedder = new GoogleGenerativeAIEmbeddings({
    model: EMBED_MODEL,
    apiKey: EMBED_API_KEY,
  });

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      specs_detail: true,
    },
    where: { deleted_at: null },
  });

  console.log(`Found ${products.length} products to embed`);

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const contents = batch.map(buildContent);
    const embeddings = await embedder.embedDocuments(contents);

    const upserts = batch.map((p, idx) => {
      const emb = embeddings[idx];
      const vector = Prisma.raw(`'[${emb.join(",")}]'::vector`);
      const content = contents[idx];
      return prisma.$executeRaw`
        INSERT INTO product_embeddings (product_id, content, embedding, updated_at)
        VALUES (${BigInt(p.id)}, ${content}, ${vector}, NOW())
        ON CONFLICT (product_id)
        DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, updated_at = NOW();
      `;
    });

    await Promise.all(upserts);
    console.log(
      `Upserted ${batch.length} products (${i + batch.length}/${
        products.length
      })`
    );
  }

  console.log("Done embedding products");
}

main()
  .catch((err) => {
    console.error("Embed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
