/**
 * Verify all seed image URLs return real images (not 404 / tiny placeholders).
 * Usage: node seed/verify-images.mjs
 */
import { CATEGORY_IMAGE_URLS, SEED_PRODUCT_IMAGES } from "./productImages.js";

const MIN_BYTES = 8000;

const check = async (url) => {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });
    const buf = await res.arrayBuffer();
    return { ok: res.ok, size: buf.byteLength, status: res.status };
  } catch (err) {
    return { ok: false, size: 0, status: 0, error: err.message };
  }
};

let failures = 0;

for (const [name, urls] of Object.entries(SEED_PRODUCT_IMAGES)) {
  for (const url of urls) {
    const { ok, size, status, error } = await check(url);
    if (!ok || size < MIN_BYTES) {
      failures += 1;
      console.error(`FAIL [${name}] status=${status} size=${size} ${error ?? ""}`);
      console.error(`  ${url}\n`);
    }
  }
}

for (const [slug, url] of Object.entries(CATEGORY_IMAGE_URLS)) {
  const { ok, size, status, error } = await check(url);
  if (!ok || size < MIN_BYTES) {
    failures += 1;
    console.error(`FAIL [category:${slug}] status=${status} size=${size} ${error ?? ""}`);
    console.error(`  ${url}\n`);
  }
}

if (failures > 0) {
  console.error(`${failures} image URL(s) failed verification.`);
  process.exit(1);
}

const productUrls = Object.values(SEED_PRODUCT_IMAGES).flat().length;
const categoryUrls = Object.keys(CATEGORY_IMAGE_URLS).length;
console.log(
  `OK — ${productUrls} product + ${categoryUrls} category image URLs verified (>= ${MIN_BYTES} bytes).`
);
