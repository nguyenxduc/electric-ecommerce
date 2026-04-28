import { prisma } from "../lib/db.js";

const toBigIntOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
};

async function getColdStartProducts(limit, categoryId = null) {
  const half = Math.ceil(limit / 2);
  const where = {
    deleted_at: null,
    ...(categoryId ? { category_id: categoryId } : {}),
  };
  const [bestSellers, newest] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ sold: "desc" }, { rating: "desc" }],
      take: half,
    }),
    prisma.product.findMany({
      where,
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

async function hydrateProductsByIds(productIds, categoryId = null, limit = 12) {
  const ids = (Array.isArray(productIds) ? productIds : [])
    .map((id) => {
      try {
        return BigInt(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      deleted_at: null,
      ...(categoryId ? { category_id: categoryId } : {}),
    },
  });

  const order = new Map(ids.map((id, i) => [id.toString(), i]));
  products.sort(
    (a, b) => (order.get(a.id.toString()) ?? 0) - (order.get(b.id.toString()) ?? 0)
  );
  return products.slice(0, limit);
}

async function getLatestOfflineRecommendation({ userId, sessionId }) {
  if (!userId && !sessionId) return null;

  return prisma.recommendationLog.findFirst({
    where: {
      strategy: { startsWith: "offline_" },
      ...(userId ? { user_id: BigInt(userId) } : { session_id: sessionId }),
    },
    orderBy: { created_at: "desc" },
  });
}

// Gợi ý trang chủ: đọc kết quả thuật toán precompute (offline).
export const getHomeRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = Number(req.query.limit || 12);
    const categoryId = toBigIntOrNull(req.query.category_id);
    const sessionId = req.headers["x-session-id"]
      ? String(req.headers["x-session-id"]).slice(0, 64)
      : null;

    if (req.query.category_id !== undefined && categoryId === null) {
      return res.status(400).json({
        success: false,
        error: "category_id không hợp lệ",
      });
    }

    let products = [];
    let strategy = "cold_start_best_seller_newest";
    const offline = await getLatestOfflineRecommendation({ userId, sessionId });
    if (offline?.product_ids?.length) {
      products = await hydrateProductsByIds(offline.product_ids, categoryId, limit);
      if (products.length > 0) {
        strategy = String(offline.strategy || "").replace(/^offline_/, "") || strategy;
      }
    }

    if (products.length < limit) {
      const cold = await getColdStartProducts(limit, categoryId);
      const map = new Map();
      products.forEach((p) => map.set(p.id.toString(), p));
      cold.forEach((p) => {
        if (!map.has(p.id.toString())) map.set(p.id.toString(), p);
      });
      products = Array.from(map.values()).slice(0, limit);
      if (strategy !== "cold_start_best_seller_newest") {
        strategy = "hybrid_offline_cold_start";
      }
    }

    // Log serving result (separate from offline precompute rows).
    await prisma.recommendationLog.create({
      data: {
        user_id: userId ? BigInt(userId) : null,
        session_id: req.headers["x-session-id"]
          ? String(req.headers["x-session-id"])
          : null,
        strategy: `serve_${strategy}`,
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
