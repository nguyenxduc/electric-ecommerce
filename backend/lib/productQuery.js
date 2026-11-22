import { prisma } from "./db.js";
import { ROLES } from "../constants/roles.js";
import { SHOP_STATUS } from "../constants/status.js";

// Truy van va dinh gia san pham dung chung.
//
// Truoc day nam trong product.controller.js (1539 dong). Tach ra day de
// controller tim-kiem-bang-anh dung lai ma khong phai import nguoc tu mot
// controller khac - huong phu thuoc sai da tung gap voi SHOP_STATUS.

export const shopSelect = { id: true, name: true, slug: true, status: true };

// Buyers only see live products (is_active) from active shops; admins see everything.
// Chu shop xem hang an cua minh qua GET /products/shop/mine va GET /products/:id.
export const buyerVisibilityWhere = (req) =>
  req?.user?.role === ROLES.ADMIN
    ? {}
    : { is_active: true, shop: { status: SHOP_STATUS.ACTIVE, deleted_at: null } };

// Bien the con hieu luc (chua xoa mem); dung chung cho list va detail.
export const variantsInclude = {
  where: { deleted_at: null },
  orderBy: { id: "asc" },
  select: { id: true, sku: true, name: true, attributes: true, price_delta: true, quantity: true },
};

// Flash sale dang chay: flash_discount > 0 va now thuoc [flash_starts_at, flash_ends_at).
export const isFlashActive = (product, now = new Date()) =>
  Number(product.flash_discount || 0) > 0 &&
  !!product.flash_starts_at &&
  !!product.flash_ends_at &&
  new Date(product.flash_starts_at) <= now &&
  now < new Date(product.flash_ends_at);

// Giam gia thuc te: trong khung flash sale thi flash_discount THAY discount thuong.
// Moi cho tinh tien (gio hang, don hang, bao gia) phai di qua ham nay.
export const effectiveDiscount = (product, now = new Date()) =>
  isFlashActive(product, now)
    ? // flash khong bao gio lam gia cao hon giam gia thuong (seller tang discount sau khi dat flash)
      Math.max(Number(product.flash_discount), Number(product.discount || 0))
    : Number(product.discount || 0);

// Helper function to calculate final_price and discount_percentage
export const calculateProductPrices = (product) => {
  const price = Number(product.price);
  const flashActive = isFlashActive(product);
  const discount = effectiveDiscount(product);
  const final_price = price - discount;
  const discount_percentage =
    price > 0 ? Math.round((discount / price) * 100) : 0;

  // sum available stock from product_colors if present
  const colors = product.product_colors || [];
  const color_stock_sum = colors.reduce(
    (sum, c) => sum + Number(c.quantity || 0),
    0
  );
  const quantity =
    color_stock_sum > 0 ? color_stock_sum : Number(product.quantity || 0);

  return {
    ...product,
    price,
    discount,
    final_price,
    discount_percentage,
    flash_discount: product.flash_discount == null ? null : Number(product.flash_discount),
    flash_sale: {
      active: flashActive,
      ends_at: flashActive ? product.flash_ends_at : null,
      original_discount: Number(product.discount || 0),
    },
    rating: product.rating ? Number(product.rating) : 0,
    quantity,
    ...(product.variants && {
      variants: product.variants.map((v) => ({ ...v, price_delta: Number(v.price_delta) })),
    }),
    available_colors: colors.map((c) => ({
      name: c.name || "",
      code: c.code || "",
      quantity: Number(c.quantity || 0),
    })),
  };
};

// Maps the public `sort` query param to a Prisma orderBy clause.
export const SORT_ORDER_BY = {
  "price-asc": { price: "asc" },
  "price-desc": { price: "desc" },
  rating: { rating: "desc" },
  popular: { sold: "desc" },
  newest: { created_at: "desc" },
  // Tiet kiem nhieu nhat (so tien); % giam la gia tri tinh nen Prisma khong sap duoc
  // shortcut: sap theo discount/price luu trong DB, khong tinh flash sale; nang cap neu can sap theo gia flash.
  discount: { discount: "desc" },
};

export const resolveOrderBy = (sort) =>
  SORT_ORDER_BY[sort] || { created_at: "desc" };

// Danh sach khong tra bang thong so chi tiet: chi trang chi tiet doc no, qua
// GET /products/:id. Bo cot nay giam payload va CPU parse/serialize khi tai cao.
const LIST_OMIT = { specs_detail: true };

export const fetchPaginatedProducts = async (where, orderBy, skip, take) => {
  const [total_count, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { product_colors: true, variants: variantsInclude, shop: { select: shopSelect } },
      omit: LIST_OMIT,
    }),
  ]);
  return { total_count, products };
};

/**
 * Lay san pham theo dung thu hang da xep san (ket qua tim kiem).
 *
 * Prisma khong sap xep duoc theo thu tu cua mot mang id truyen vao, ma dung
 * `where: { id: { in: ids } }` roi de Prisma tu sap thi mat sach thu hang -
 * ket qua khop nhat co the roi xuong trang hai. Vi so ung vien da bi chan o
 * 200 nen lay het ve roi sap trong bo nho la re va dung.
 */
export const fetchRankedProducts = async (where, rankedIds, skip, take) => {
  const products = await prisma.product.findMany({
    where,
    include: { product_colors: true, variants: variantsInclude, shop: { select: shopSelect } },
    omit: LIST_OMIT,
  });

  const rank = new Map(rankedIds.map((id, i) => [id.toString(), i]));
  products.sort(
    (a, b) =>
      (rank.get(a.id.toString()) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.id.toString()) ?? Number.MAX_SAFE_INTEGER)
  );

  return {
    total_count: products.length,
    products: products.slice(skip, skip + take),
  };
};
