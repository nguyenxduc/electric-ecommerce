/**
 * Offline job: precompute home recommendations per user from behavior + CF.
 * Run: npm run job:offline-user-recommendation
 */
import { prisma } from "../lib/db.js";

const LIMIT = 24;

async function getColdStartProducts(limit) {
  const half = Math.ceil(limit / 2);
  const [bestSellers, newest] = await Promise.all([
    prisma.product.findMany({
      where: { deleted_at: null },
      orderBy: [{ sold: "desc" }, { rating: "desc" }],
      take: half,
    }),
    prisma.product.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: Math.floor(limit / 2),
    }),
  ]);

  const map = new Map();
  [...bestSellers, ...newest].forEach((p) => {
    if (!map.has(p.id.toString())) map.set(p.id.toString(), p);
  });
  return Array.from(map.values()).slice(0, limit);
}

async function getCfProductsFromBehavior(userId, limit) {
  const rows = await prisma.userBehavior.findMany({
    where: {
      user_id: userId,
      product_id: { not: null },
      event_type: { in: ["view", "click", "add_to_cart", "purchase"] },
    },
    orderBy: { event_time: "desc" },
    take: 40,
    select: { product_id: true },
  });

  const seen = new Set();
  const seedIds = [];
  for (const r of rows) {
    if (!r.product_id) continue;
    const id = r.product_id.toString();
    if (!seen.has(id)) {
      seen.add(id);
      seedIds.push(r.product_id);
      if (seedIds.length >= 6) break;
    }
  }
  if (seedIds.length === 0) return [];

  const simRows = await prisma.productSimilarity.findMany({
    where: { product_id: { in: seedIds } },
    orderBy: { score: "desc" },
    take: limit * 3,
  });

  const productIds = [];
  const seenP = new Set();
  for (const s of simRows) {
    const sid = s.similar_product_id.toString();
    if (seenP.has(sid)) continue;
    seenP.add(sid);
    productIds.push(s.similar_product_id);
    if (productIds.length >= limit) break;
  }
  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deleted_at: null },
  });
  const order = new Map(productIds.map((id, i) => [id.toString(), i]));
  products.sort(
    (a, b) => (order.get(a.id.toString()) ?? 0) - (order.get(b.id.toString()) ?? 0)
  );
  return products.slice(0, limit);
}

async function getBehaviorOnlyProducts(userId, limit) {
  const rows = await prisma.userBehavior.findMany({
    where: {
      user_id: userId,
      product_id: { not: null },
      event_type: { in: ["view", "click", "add_to_cart", "purchase"] },
    },
    orderBy: { event_time: "desc" },
    take: 200,
    select: { product_id: true, event_type: true },
  });
  if (rows.length === 0) return [];

  const weightByEvent = { purchase: 4, add_to_cart: 3, click: 2, view: 1 };
  const scoreByProduct = new Map();
  rows.forEach((r, idx) => {
    if (!r.product_id) return;
    const pid = r.product_id.toString();
    const baseWeight = weightByEvent[r.event_type] ?? 1;
    const recencyBoost = Math.max(0.2, 1 - idx / 250);
    const score = baseWeight * recencyBoost;
    scoreByProduct.set(pid, (scoreByProduct.get(pid) || 0) + score);
  });

  const orderedIds = [...scoreByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pid]) => BigInt(pid))
    .slice(0, limit * 3);
  if (orderedIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: orderedIds }, deleted_at: null },
  });
  const order = new Map(orderedIds.map((id, i) => [id.toString(), i]));
  products.sort(
    (a, b) => (order.get(a.id.toString()) ?? 0) - (order.get(b.id.toString()) ?? 0)
  );
  return products.slice(0, limit);
}

async function computeForUser(userId) {
  let strategy = "offline_cold_start_best_seller_newest";
  let products = await getCfProductsFromBehavior(userId, LIMIT);
  if (products.length > 0) {
    strategy = "offline_personalized_cf_behavior";
  }

  if (products.length === 0) {
    const behavior = await getBehaviorOnlyProducts(userId, LIMIT);
    if (behavior.length > 0) {
      products = behavior;
      strategy = "offline_personalized_behavior_recent";
    }
  }

  if (products.length < LIMIT) {
    const cold = await getColdStartProducts(LIMIT);
    const map = new Map();
    products.forEach((p) => map.set(p.id.toString(), p));
    cold.forEach((p) => {
      if (!map.has(p.id.toString())) map.set(p.id.toString(), p);
    });
    products = Array.from(map.values()).slice(0, LIMIT);
    if (strategy !== "offline_cold_start_best_seller_newest") {
      strategy = "offline_hybrid_offline_cold_start";
    }
  }

  await prisma.recommendationLog.create({
    data: {
      user_id: userId,
      session_id: null,
      strategy,
      product_ids: products.map((p) => BigInt(p.id)),
    },
  });

  return { strategy, count: products.length };
}

async function main() {
  const users = await prisma.userBehavior.findMany({
    where: { user_id: { not: null } },
    distinct: ["user_id"],
    select: { user_id: true },
    take: 5000,
  });

  console.log(`[offline-reco] Found ${users.length} users with behavior.`);
  let ok = 0;
  for (const row of users) {
    if (!row.user_id) continue;
    await computeForUser(row.user_id);
    ok += 1;
  }
  console.log(`[offline-reco] Done. Computed ${ok} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
