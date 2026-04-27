import { prisma } from "../lib/db.js";

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
      user_id: BigInt(userId),
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
    where: {
      product_id: { in: seedIds },
    },
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
    where: {
      id: { in: productIds },
      deleted_at: null,
    },
  });

  const order = new Map(productIds.map((id, i) => [id.toString(), i]));
  products.sort(
    (a, b) => (order.get(a.id.toString()) ?? 0) - (order.get(b.id.toString()) ?? 0)
  );
  return products.slice(0, limit);
}

// Gợi ý trang chủ: ưu tiên CF từ hành vi; fallback cold-start.
export const getHomeRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = Number(req.query.limit || 12);

    let products = [];
    let strategy = "cold_start_best_seller_newest";

    if (userId) {
      const cf = await getCfProductsFromBehavior(userId, limit);
      if (cf.length > 0) {
        products = cf;
        strategy = "personalized_cf_behavior";
      }
    }

    if (products.length < limit) {
      const cold = await getColdStartProducts(limit);
      const map = new Map();
      products.forEach((p) => map.set(p.id.toString(), p));
      cold.forEach((p) => {
        if (!map.has(p.id.toString())) map.set(p.id.toString(), p);
      });
      products = Array.from(map.values()).slice(0, limit);
      if (userId && strategy === "personalized_cf_behavior") {
        strategy = "hybrid_cf_cold_start";
      }
    }

    await prisma.recommendationLog.create({
      data: {
        user_id: userId ? BigInt(userId) : null,
        session_id: req.headers["x-session-id"]
          ? String(req.headers["x-session-id"])
          : null,
        strategy,
        product_ids: products.map((p) => BigInt(p.id)),
      },
    });

    return res.json({
      success: true,
      data: {
        products,
        strategy,
      },
    });
  } catch (error) {
    console.error("getHomeRecommendations error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể lấy gợi ý sản phẩm",
    });
  }
};
