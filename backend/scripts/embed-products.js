import "dotenv/config";
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProxyAgent, setGlobalDispatcher } from "undici";

import { Prisma } from "@prisma/client";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GEMINI_API_KEY } from "../ai/geminiConfig.js";
import { prisma } from "../lib/db.js";

dns.setDefaultResultOrder("ipv4first");

const EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const EMBED_API_KEY = GEMINI_API_KEY;
const BATCH_SIZE = 25;
const AI_PROXY_URL =
  process.env.AI_HTTP_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  "";

if (AI_PROXY_URL) {
  setGlobalDispatcher(new ProxyAgent(AI_PROXY_URL));
}

// specs_detail la danh sach NHOM [{ category, items: [{ label, value }] }].
// Truoc day doc no nhu mang phang {label, value} nen moi san pham chi ra
// "Specs: : "" | : """: vector khong biet RTX 4060 hay chip M3 nam o may nao,
// va chatbot cung khong thay thong so trong ngu canh. Van nhan dang phang cu.
export const buildContent = (product) => {
  const groups = Array.isArray(product.specs_detail)
    ? product.specs_detail
    : [];
  const specsText = groups
    .flatMap((g) => (Array.isArray(g?.items) ? g.items : [g]))
    .filter((s) => s?.label && s?.value != null && s.value !== "")
    .map((s) => `${s.label}: ${s.value}`)
    .join(" | ");
  const price = product.price ? product.price.toString() : "";
  return `Name: ${product.name} | Price: ${price} | Specs: ${specsText}`;
};

export async function embedProducts({ force = false } = {}) {
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
      updated_at: true,
      embedding: {
        select: {
          updated_at: true,
        },
      },
    },
    where: { deleted_at: null },
  });

  const productsToEmbed = force
    ? products
    : products.filter(
        (product) =>
          !product.embedding ||
          product.updated_at > product.embedding.updated_at
      );

  console.log(
    `Found ${productsToEmbed.length}/${products.length} products to embed`
  );

  for (let i = 0; i < productsToEmbed.length; i += BATCH_SIZE) {
    const batch = productsToEmbed.slice(i, i + BATCH_SIZE);
    const contents = batch.map(buildContent);
    const embeddings = await embedder.embedDocuments(contents);

    const upserts = batch.map((product, index) => {
      const embedding = embeddings[index];
      const vector = Prisma.raw(`'[${embedding.join(",")}]'::vector`);
      const content = contents[index];
      return prisma.$executeRaw`
        INSERT INTO product_embeddings (product_id, content, embedding, updated_at)
        VALUES (${BigInt(product.id)}, ${content}, ${vector}, NOW())
        ON CONFLICT (product_id)
        DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, updated_at = NOW();
      `;
    });

    await Promise.all(upserts);
    console.log(
      `Upserted ${batch.length} products (${i + batch.length}/${
        productsToEmbed.length
      })`
    );
  }

  console.log("Done embedding products");
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  embedProducts({ force: process.argv.includes("--force") })
    .catch((error) => {
      console.error("Embed error:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
