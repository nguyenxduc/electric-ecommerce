import { prisma } from "../lib/db.js";
import { findSearchCandidateIds } from "../lib/productSearch.js";
import { buyerVisibilityWhere, calculateProductPrices } from "../lib/productQuery.js";
import { normalizeText } from "../lib/vietnamese.js";
import { SHOP_STATUS } from "../constants/status.js";
import { ROLES } from "../constants/roles.js";

// Goi y o tim kiem: san pham + danh muc + gian hang; q rong thi tra tu khoa thinh hanh.

export const MAX_SUGGEST_QUERY = 100;
const TRENDING_TTL_MS = 60_000;
let trendingCache = { at: 0, value: null };

// Khop chuoi con khong dau (cung unaccent voi productSearch). normalizeText chi
// con [a-z0-9 ] nen khong can escape ky tu dai dien cua LIKE.
const matchLike = (q) => `%${normalizeText(q)}%`;

const suggestCategories = (q) =>
  prisma.$queryRaw`
    SELECT id, name, slug FROM categories
    WHERE deleted_at IS NULL AND name IS NOT NULL
      AND immutable_unaccent(lower(name)) LIKE ${matchLike(q)}
    ORDER BY (immutable_unaccent(lower(name)) LIKE ${normalizeText(q) + "%"}) DESC, name
    LIMIT 3`;

const suggestShops = (q) =>
  prisma.$queryRaw`
    SELECT name, slug, logo_url FROM shops
    WHERE deleted_at IS NULL AND status = ${SHOP_STATUS.ACTIVE}
      AND immutable_unaccent(lower(name)) LIKE ${matchLike(q)}
    ORDER BY name
    LIMIT 3`;

const suggestProducts = async (req, q) => {
  const ids = await findSearchCandidateIds(prisma, q, {
    limit: 30,
    activeShopsOnly: req?.user?.role !== ROLES.ADMIN,
  });
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, deleted_at: null, ...buyerVisibilityWhere(req) },
    select: { id: true, name: true, img: true, price: true, discount: true, flash_discount: true, flash_starts_at: true, flash_ends_at: true },
  });
  const rank = new Map(ids.map((id, i) => [id.toString(), i]));
  rows.sort((a, b) => rank.get(a.id.toString()) - rank.get(b.id.toString()));
  return rows.slice(0, 6).map((p) => ({
    id: Number(p.id),
    name: p.name,
    img: p.img?.[0] ?? null,
    final_price: calculateProductPrices(p).final_price,
  }));
};

// Tu khoa thinh hanh: 2 tu dau ten cac san pham ban chay nhat (vd "Xiaomi 14")
// + ten danh muc. Xac dinh, khong can bang moi.
const buildTrending = async () => {
  const top = await prisma.product.findMany({
    where: { deleted_at: null, ...buyerVisibilityWhere(null) },
    orderBy: [{ sold: "desc" }, { id: "asc" }],
    select: { name: true },
    take: 12,
  });
  const cats = await prisma.category.findMany({
    where: { deleted_at: null, name: { not: null } },
    orderBy: { id: "asc" },
    select: { name: true },
    take: 4,
  });
  const seen = new Set();
  return [...top.map((p) => p.name.split(/\s+/).slice(0, 2).join(" ")), ...cats.map((c) => c.name)]
    .filter((k) => k && !seen.has(k.toLowerCase()) && seen.add(k.toLowerCase()))
    .slice(0, 8);
};

export const getTrending = async () => {
  if (trendingCache.value && Date.now() - trendingCache.at < TRENDING_TTL_MS) return trendingCache.value;
  const value = await buildTrending();
  trendingCache = { at: Date.now(), value };
  return value;
};

export const suggest = async (req, q) => {
  const [products, categories, shops] = await Promise.all([
    suggestProducts(req, q),
    suggestCategories(q),
    suggestShops(q),
  ]);
  return {
    products,
    categories: categories.map((c) => ({ id: Number(c.id), name: c.name, slug: c.slug })),
    shops,
  };
};
