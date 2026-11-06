import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import { ROLES } from "../constants/roles.js";
import { SHOP_STATUS } from "../constants/status.js";
import {
  parsePagination,
  buildPaginationMeta,
  clampLimit,
} from "../lib/pagination.js";

import {
  buyerVisibilityWhere,
  calculateProductPrices,
  fetchPaginatedProducts,
  fetchRankedProducts,
  resolveOrderBy,
  shopSelect,
  variantsInclude,
} from "../lib/productQuery.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { findSearchCandidateIds } from "../lib/productSearch.js";
import { resolveFilteredProductIds } from "../services/productFilter.service.js";

// Chuan hoa + kiem tra mang bien the tu payload; tra { error } hoac { variants }.
// Tra undefined neu client khong gui `variants` (giu nguyen bien the hien co).
const parseVariantsInput = (raw) => {
  if (raw === undefined) return { variants: undefined };
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return { error: "variants must be a JSON array" };
    }
  }
  if (!Array.isArray(list)) return { error: "variants must be an array" };
  const seen = new Set();
  const variants = [];
  for (const v of list) {
    const sku = String(v?.sku ?? "").trim();
    const name = String(v?.name ?? "").trim();
    const delta = v?.price_delta === undefined ? 0 : Number(v.price_delta);
    const qty = v?.quantity === undefined ? 0 : Number(v.quantity);
    if (!sku || sku.length > 64) return { error: "Variant sku is required (max 64 chars)" };
    if (!name || name.length > 120) return { error: "Variant name is required (max 120 chars)" };
    if (!Number.isFinite(delta)) return { error: "Variant price_delta must be a number" };
    if (!Number.isInteger(qty) || qty < 0) {
      return { error: "Variant quantity must be a non-negative integer" };
    }
    // id rac (abc, 1.5) nem loi BigInt -> 500; chan o day de tra 400
    if (v?.id != null && v.id !== "" && !/^\d{1,18}$/.test(String(v.id))) {
      return { error: "Variant id is invalid" };
    }
    if (seen.has(sku)) return { error: `Duplicate variant sku ${sku}` };
    seen.add(sku);
    const attributes =
      v.attributes && typeof v.attributes === "object" && !Array.isArray(v.attributes)
        ? v.attributes
        : {};
    variants.push({
      id: v.id != null && v.id !== "" ? BigInt(v.id) : null,
      sku,
      name,
      attributes,
      price_delta: delta,
      quantity: qty,
    });
  }
  return { variants };
};

// Khoi luong (gram) dung bao gia van chuyen; undefined = giu nguyen / mac dinh cua DB.
// Truoc day API bo qua weight_grams nen seller khong chinh duoc can nang.
const parseWeight = (raw) => {
  if (raw === undefined || raw === null || raw === "") return { weight: undefined };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
    return { error: "weight_grams must be an integer between 1 and 1000000" };
  }
  return { weight: n };
};

// Dong bo bien the cua san pham: upsert theo id, xoa mem cai bi bo. Nem VARIANT_SKU_CONFLICT /
// VARIANT_FOREIGN neu sku trung hoac id khong thuoc san pham.
const syncVariants = async (tx, productId, variants) => {
  const existing = await tx.productVariant.findMany({
    where: { product_id: productId, deleted_at: null },
    select: { id: true },
  });
  const ownIds = new Set(existing.map((e) => e.id.toString()));
  const keep = new Set();
  for (const v of variants) {
    const data = {
      sku: v.sku,
      name: v.name,
      attributes: v.attributes,
      price_delta: v.price_delta,
      quantity: v.quantity,
    };
    if (v.id) {
      if (!ownIds.has(v.id.toString())) throw new Error("VARIANT_FOREIGN");
      keep.add(v.id.toString());
      await tx.productVariant.update({ where: { id: v.id }, data });
    } else {
      await tx.productVariant.create({ data: { ...data, product_id: productId } });
    }
  }
  const removed = [...ownIds].filter((id) => !keep.has(id)).map(BigInt);
  if (removed.length) {
    // sku duoc doi sang gia tri duy nhat de giai phong sku cho lan dung lai
    for (const id of removed) {
      await tx.productVariant.update({
        where: { id },
        data: { deleted_at: new Date(), sku: `deleted-${id}-${Date.now()}` },
      });
    }
  }
};

// Chay sau moi lan luu san pham (ke ca khi payload khong co variants): gia hieu dung
// = price - discount + price_delta phai > 0 va quantity = tong ton kho bien the con hieu luc,
// de colors/quantity trong payload khong ghi de ton kho bien the.
const settleVariants = async (tx, productId, price, discount) => {
  const active = await tx.productVariant.findMany({
    where: { product_id: productId, deleted_at: null },
    select: { price_delta: true, quantity: true },
  });
  if (active.length === 0) return null;
  if (active.some((v) => price - discount + Number(v.price_delta) <= 0)) {
    throw new Error("VARIANT_PRICE");
  }
  const sumQty = active.reduce((s, v) => s + v.quantity, 0);
  await tx.product.update({ where: { id: productId }, data: { quantity: sumQty } });
  return sumQty;
};

// Map loi sync bien the sang HTTP; tra true neu da xu ly.
const respondVariantError = (err, res) => {
  if (err?.message === "VARIANT_FOREIGN") {
    res.status(400).json({ message: "Variant does not belong to this product" });
    return true;
  }
  if (err?.message === "VARIANT_PRICE") {
    res.status(400).json({ message: "Variant price must be greater than 0 after discount" });
    return true;
  }
  if (err?.code === "P2002") {
    res.status(409).json({ message: "Variant sku already exists" });
    return true;
  }
  return false;
};

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    discount = 0,
    quantity = 0,
    img = [],
    specs,
    specs_detail,
    color, // legacy
    product_colors = [],
    category_id,
    sub_category_id,
    description = "",
  } = req.body;

  const parseJsonArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value) || typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  };

  const parseBigIntOrUndefined = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const num = Number(v);
    if (Number.isNaN(num)) return undefined;
    return BigInt(num);
  };

  const parseSubCategory = (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const num = Number(v);
    if (Number.isNaN(num)) return null;
    return BigInt(num);
  };

  // Sellers always create under their own shop (client-supplied shop_id is
  // ignored); admins must name the target shop explicitly.
  let shopId;
  if (req.user.role === ROLES.ADMIN) {
    shopId = parseBigIntOrUndefined(req.body.shop_id);
    if (!shopId) {
      return res.status(400).json({
        message: "shop_id is required when creating a product as admin",
      });
    }
    const targetShop = await prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!targetShop || targetShop.deleted_at) {
      return res.status(404).json({ message: "Shop not found" });
    }
  } else {
    shopId = req.shop.id;
  }

  // ✅ đảm bảo JSON đúng kiểu
  const specsJson = parseJsonArray(specs);
  const specsDetailJson = parseJsonArray(specs_detail);
  const colorJson = parseJsonArray(color);

  let imageUrls = Array.isArray(img) ? img : [];
  if (Array.isArray(req.files) && req.files.length > 0) {
    const uploads = await Promise.all(
      req.files.map((file) =>
        cloudinary.uploader.upload(file.path, { folder: "products" })
      )
    );
    imageUrls = uploads.map((u) => u.secure_url);
  }

  const colorsInput =
    Array.isArray(product_colors) && product_colors.length
      ? product_colors
      : colorJson;

  const numericPrice = Number(price);
  const numericDiscount = Number(discount);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res
      .status(400)
      .json({ message: "Price must be a non-negative number" });
  }
  if (
    !Number.isFinite(numericDiscount) ||
    numericDiscount < 0 ||
    numericDiscount > numericPrice
  ) {
    return res.status(400).json({
      message: "Discount must be between 0 and the product price",
    });
  }

  const { variants: variantsInput, error: variantError } = parseVariantsInput(
    req.body.variants
  );
  if (variantError) return res.status(400).json({ message: variantError });
  const { weight, error: weightError } = parseWeight(req.body.weight_grams);
  if (weightError) return res.status(400).json({ message: weightError });

  let result;
  try {
  result = await prisma.$transaction(async (tx) => {
    const savedProduct = await tx.product.create({
      data: {
        name,
        price: numericPrice,
        discount: numericDiscount,
        quantity: Number(quantity),
        img: imageUrls,
        specs: specsJson, // ✅ JSON
        specs_detail: specsDetailJson, // ✅ JSON
        color: colorJson, // ✅ JSON
        shop_id: shopId,
        category_id: parseBigIntOrUndefined(category_id),
        sub_category_id: parseSubCategory(sub_category_id),
        description: String(description),
        weight_grams: weight,
      },
    });

    if (Array.isArray(colorsInput) && colorsInput.length > 0) {
      await tx.productColor.createMany({
        data: colorsInput.map((c) => ({
          product_id: savedProduct.id,
          name: c.name || "",
          code: c.code || "",
          quantity: Number(c.quantity || 0),
        })),
      });

      const sumQty = colorsInput.reduce(
        (sum, c) => sum + Number(c.quantity || 0),
        0
      );

      await tx.product.update({
        where: { id: savedProduct.id },
        data: { quantity: sumQty },
      });

      savedProduct.quantity = sumQty;
    }

    if (variantsInput?.length) await syncVariants(tx, savedProduct.id, variantsInput);
    const sumQty = await settleVariants(tx, savedProduct.id, numericPrice, numericDiscount);
    if (sumQty !== null) savedProduct.quantity = sumQty;

    return savedProduct;
  });
  } catch (err) {
    if (respondVariantError(err, res)) return;
    throw err;
  }

  res.status(201).json({
    message: "Product created successfully",
    product: result,
  });
});

export const getAllProducts = asyncHandler(async (req, res) => {
  // Standard query parameters (not filters)
  const standardParams = [
    "search",
    "category_id",
    "sub_category_id",
    "shop_id",
    "in_stock",
    "price_min",
    "price_max",
    "discount",
    "sort",
    "page",
    "limit",
  ];

  const {
    search,
    category_id,
    sub_category_id,
    shop_id,
    in_stock,
    price_min,
    price_max,
    discount,
    sort,
    page = 1,
    limit = 20,
  } = req.query;

  // Extract all filter parameters (everything except standard params)
  const filterParams = {};
  Object.keys(req.query).forEach((key) => {
    if (!standardParams.includes(key) && req.query[key]) {
      filterParams[key] = req.query[key];
    }
  });

  // Special handling for discount parameter
  // If discount is not "true", treat it as a dynamic filter
  if (discount && discount !== "true") {
    filterParams.discount = discount;
  }

  const where = {};
  if (search) where.name = { contains: String(search), mode: "insensitive" };
  if (category_id) where.category_id = BigInt(category_id);
  if (sub_category_id) where.sub_category_id = BigInt(sub_category_id);
  if (shop_id) where.shop_id = BigInt(shop_id);
  if (in_stock === "true") where.quantity = { gt: 0 };
  if (discount === "true") where.discount = { gt: 0 };
  if (price_min || price_max) {
    where.price = {};
    if (price_min) where.price.gte = Number(price_min);
    if (price_max) where.price.lte = Number(price_max);
  }

  const orderBy = resolveOrderBy(sort);

  const { currentPage, perPage, skip } = parsePagination(page, limit);
  const baseWhere = { ...where, deleted_at: null, ...buyerVisibilityWhere(req) };

  if (Object.keys(filterParams).length === 0) {
    const { total_count, products } = await fetchPaginatedProducts(
      baseWhere,
      orderBy,
      skip,
      perPage
    );

    return res.json({
      products: products.map(calculateProductPrices),
      pagination: buildPaginationMeta(currentPage, perPage, total_count),
    });
  }

  // Bo loc dong: giai ra danh sach id, quy tac nam o services/productFilter.
  const productIdsArray = await resolveFilteredProductIds(filterParams);

  if (productIdsArray.length === 0) {
    return res.json({
      products: [],
      pagination: buildPaginationMeta(currentPage, perPage, 0),
    });
  }

  const filteredWhere = { ...baseWhere, id: { in: productIdsArray } };
  const { total_count, products } = await fetchPaginatedProducts(
    filteredWhere,
    orderBy,
    skip,
    perPage
  );

  res.json({
    products: products.map(calculateProductPrices),
    pagination: buildPaginationMeta(currentPage, perPage, total_count),
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: BigInt(req.params.id), deleted_at: null },
    include: {
      product_colors: true,
      variants: variantsInclude,
      shop: { select: { ...shopSelect, owner_id: true } },
    },
  });

  const isAdmin = req.user?.role === ROLES.ADMIN;
  const isShopOwner =
    req.user && product?.shop?.owner_id?.toString() === req.user.id;
  if (
    !product ||
    (product.shop?.status !== SHOP_STATUS.ACTIVE && !isAdmin && !isShopOwner)
  ) {
    return res.status(404).json({ message: "Product not found" });
  }

  const { owner_id, ...publicShop } = product.shop || {};
  const productWithCalculations = calculateProductPrices({
    ...product,
    shop: publicShop,
  });
  const in_stock = Number(productWithCalculations.quantity) > 0;
  res.json({ ...productWithCalculations, in_stock });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const data = req.body;
  // Upload new images if provided
  let imageUrls;
  if (Array.isArray(req.files) && req.files.length > 0) {
    const uploads = await Promise.all(
      req.files.map((file) =>
        cloudinary.uploader.upload(file.path, { folder: "products" })
      )
    );
    imageUrls = uploads.map((u) => u.secure_url);
  }

  // Parse specs/specs_detail if sent as JSON string
  const parsedSpecs =
    typeof data.specs === "string"
      ? (() => {
          try {
            return JSON.parse(data.specs);
          } catch {
            return undefined;
          }
        })()
      : data.specs;

  const parsedSpecsDetail =
    typeof data.specs_detail === "string"
      ? (() => {
          try {
            return JSON.parse(data.specs_detail);
          } catch {
            return undefined;
          }
        })()
      : data.specs_detail;

  // Parse product colors
  let colorsInput = [];
  if (typeof data.product_colors === "string") {
    try {
      colorsInput = JSON.parse(data.product_colors);
    } catch {
      colorsInput = [];
    }
  } else if (
    Array.isArray(data.product_colors) &&
    data.product_colors.length
  ) {
    colorsInput = data.product_colors;
  } else if (Array.isArray(data.color)) {
    // legacy fallback
    colorsInput = data.color;
  }

  // Parse img array if sent as JSON string
  const parsedImg =
    typeof data.img === "string"
      ? (() => {
          try {
            return JSON.parse(data.img);
          } catch {
            return data.img;
          }
        })()
      : data.img;

  // Helpers to safely parse IDs
  const parseBigIntOrUndefined = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const num = Number(v);
    if (Number.isNaN(num)) return undefined;
    return BigInt(num);
  };
  const parseSubCategory = (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const num = Number(v);
    if (Number.isNaN(num)) return null;
    return BigInt(num);
  };

  // Validate against the effective price/discount (falling back to the
  // current row for whichever field isn't being changed in this request) -
  // otherwise a discount > price (or a negative price) can be saved with
  // nothing on either the frontend or backend blocking it.
  const currentProduct = await prisma.product.findUnique({
    where: { id: BigInt(req.params.id) },
    select: { price: true, discount: true },
  });
  if (!currentProduct) {
    return res.status(404).json({ message: "Product not found" });
  }
  const numericPrice =
    data.price !== undefined ? Number(data.price) : Number(currentProduct.price);
  const numericDiscount =
    data.discount !== undefined
      ? Number(data.discount)
      : Number(currentProduct.discount);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res
      .status(400)
      .json({ message: "Price must be a non-negative number" });
  }
  if (
    !Number.isFinite(numericDiscount) ||
    numericDiscount < 0 ||
    numericDiscount > numericPrice
  ) {
    return res.status(400).json({
      message: "Discount must be between 0 and the product price",
    });
  }

  const { variants: variantsInput, error: variantError } = parseVariantsInput(
    data.variants
  );
  if (variantError) return res.status(400).json({ message: variantError });
  const { weight, error: weightError } = parseWeight(data.weight_grams);
  if (weightError) return res.status(400).json({ message: weightError });

  let updatedProduct;
  try {
  updatedProduct = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: BigInt(req.params.id) },
      data: {
        name: data.name ?? undefined,
        price: data.price !== undefined ? numericPrice : undefined,
        discount: data.discount !== undefined ? numericDiscount : undefined,
        img: imageUrls ?? parsedImg ?? undefined,
        specs: parsedSpecs ?? undefined,
        specs_detail: parsedSpecsDetail ?? undefined,
        category_id: parseBigIntOrUndefined(data.category_id),
        sub_category_id: parseSubCategory(data.sub_category_id),
        description: data.description ?? undefined,
        weight_grams: weight,
      },
    });

    if (colorsInput.length > 0) {
      await tx.productColor.deleteMany({
        where: { product_id: BigInt(req.params.id) },
      });
      await tx.productColor.createMany({
        data: colorsInput.map((c) => ({
          product_id: BigInt(req.params.id),
          name: c.name || "",
          code: c.code || "",
          quantity: Number(c.quantity || 0),
        })),
      });
      const sumQty = colorsInput.reduce(
        (sum, c) => sum + Number(c.quantity || 0),
        0
      );
      await tx.product.update({
        where: { id: BigInt(req.params.id) },
        data: { quantity: sumQty },
      });
      updated.quantity = sumQty;
    } else if (data.quantity !== undefined) {
      await tx.product.update({
        where: { id: BigInt(req.params.id) },
        data: { quantity: Number(data.quantity) },
      });
      updated.quantity = Number(data.quantity);
    }

    if (variantsInput !== undefined) {
      await syncVariants(tx, BigInt(req.params.id), variantsInput);
    }
    const settledQty = await settleVariants(
      tx,
      BigInt(req.params.id),
      numericPrice,
      numericDiscount
    );
    if (settledQty !== null) updated.quantity = settledQty;

    return updated;
  });
  } catch (err) {
    if (respondVariantError(err, res)) return;
    throw err;
  }

  res.json({
    message: "Product updated successfully",
    product: updatedProduct,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await prisma.product.update({
    where: { id: BigInt(req.params.id) },
    data: { deleted_at: new Date() },
  });
  res.json({ message: "Product deleted successfully" });
});

export const searchProducts = asyncHandler(async (req, res) => {
  const {
    query,
    category_id,
    sub_category_id,
    price_min,
    price_max,
    rating_min,
    sort = "newest",
    page = 1,
    limit = 20,
  } = req.query;

  const where = { deleted_at: null, ...buyerVisibilityWhere(req) };
  let rankedIds = null;

  if (query) {
    // O tim kiem di qua cung mot duong voi tro ly ao: full-text co xep hang,
    // cong trigram lam luoi cho loi go phim. Truoc day cho nay dung `contains`,
    // nghia la go "iphon" hay "labtop" tra ve rong - dung thu ma de cuong hua
    // la co ho tro sua loi chinh ta nhe.
    const activeShopsOnly = req?.user?.role !== ROLES.ADMIN;
    const ids = await findSearchCandidateIds(prisma, String(query), {
      activeShopsOnly,
    });
    if (ids.length > 0) {
      where.id = { in: ids };
      rankedIds = ids;
    } else {
      // Khong nhanh nao tim thay gi: lui ve so khop chuoi con de khong bao gio
      // tra ve te hon cach cu.
      where.name = { contains: String(query), mode: "insensitive" };
    }
  }
  if (category_id) where.category_id = BigInt(category_id);
  if (sub_category_id) where.sub_category_id = BigInt(sub_category_id);
  if (price_min || price_max) {
    where.price = {};
    if (price_min) where.price.gte = Number(price_min);
    if (price_max) where.price.lte = Number(price_max);
  }
  if (rating_min) where.rating = { gte: Number(rating_min) };

  const orderBy = resolveOrderBy(sort);

  const { currentPage, perPage, skip } = parsePagination(page, limit);

  // Nguoi dung tu chon cach sap xep thi ton trong lua chon do; khong chon thi
  // giu nguyen thu hang cua bo tim kiem, vi ket qua khop nhat phai nam tren.
  const useRank = rankedIds !== null && !req.query.sort;
  const { total_count, products } = useRank
    ? await fetchRankedProducts(where, rankedIds, skip, perPage)
    : await fetchPaginatedProducts(where, orderBy, skip, perPage);

  res.json({
    products: products.map(calculateProductPrices),
    pagination: buildPaginationMeta(currentPage, perPage, total_count),
  });
});


export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = "newest" } = req.query;
  const { currentPage, perPage, skip } = parsePagination(page, limit);

  const orderBy = resolveOrderBy(sort);

  const where = {
    category_id: BigInt(req.params.categoryId),
    deleted_at: null,
    ...buyerVisibilityWhere(req),
  };

  const { total_count, products } = await fetchPaginatedProducts(
    where,
    orderBy,
    skip,
    perPage
  );

  res.json({
    products: products.map(calculateProductPrices),
    pagination: buildPaginationMeta(currentPage, perPage, total_count),
  });
});

// GET /api/shops/:slug/products — public product listing for a shop page
export const getProductsByShop = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = "newest", search } = req.query;
  const { currentPage, perPage, skip } = parsePagination(page, limit);

  const shop = await prisma.shop.findFirst({
    where: {
      slug: req.params.slug,
      status: SHOP_STATUS.ACTIVE,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!shop) {
    return res.status(404).json({ message: "Shop not found" });
  }

  const orderBy = resolveOrderBy(sort);

  const where = {
    shop_id: shop.id,
    deleted_at: null,
    ...(search && {
      name: { contains: String(search), mode: "insensitive" },
    }),
  };

  const { total_count, products } = await fetchPaginatedProducts(
    where,
    orderBy,
    skip,
    perPage
  );

  res.json({
    products: products.map(calculateProductPrices),
    pagination: buildPaginationMeta(currentPage, perPage, total_count),
  });
});

// GET /api/products/shop/mine — seller dashboard list (own shop, any status)
export const getMyShopProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = "newest", search } = req.query;
  const { currentPage, perPage, skip } = parsePagination(page, limit);

  // Admins have no shop of their own; they use GET /api/products?shop_id=...
  if (!req.shop) {
    return res.status(400).json({
      message: "No shop attached to this account; use ?shop_id= filter instead",
    });
  }

  const orderBy = resolveOrderBy(sort);

  const where = {
    shop_id: req.shop.id,
    deleted_at: null,
    ...(search && {
      name: { contains: String(search), mode: "insensitive" },
    }),
  };

  const { total_count, products } = await fetchPaginatedProducts(
    where,
    orderBy,
    skip,
    perPage
  );

  res.json({
    products: products.map(calculateProductPrices),
    pagination: buildPaginationMeta(currentPage, perPage, total_count),
  });
});

export const uploadProductImages = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: BigInt(req.params.id) },
  });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "No image file provided" });
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "products",
    width: 500,
    crop: "scale",
  });

  const newImgs = Array.isArray(product.img)
    ? [...product.img, result.secure_url]
    : [result.secure_url];
  const updated = await prisma.product.update({
    where: { id: BigInt(req.params.id) },
    data: { img: newImgs },
  });

  res.json({ message: "Image uploaded successfully", product: updated });
});

export const deleteProductImage = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: BigInt(req.params.id) },
  });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const { imageId } = req.params;
  const filtered = (Array.isArray(product.img) ? product.img : []).filter(
    (url) => url !== imageId
  );
  const updated = await prisma.product.update({
    where: { id: BigInt(req.params.id) },
    data: { img: filtered },
  });

  res.json({ message: "Image deleted successfully", product: updated });
});

export const addSales = asyncHandler(async (req, res) => {
  const { amount, color_name } = req.body;
  const id = BigInt(req.params.id);
  const qty = Number(amount);
  if (!qty || qty <= 0)
    return res
      .status(400)
      .json({ success: false, message: "Invalid amount" });
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product)
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });

  // Decrement the real per-color inventory (product_colors), the same
  // table the storefront reads stock from - the old code adjusted the
  // legacy `color` JSON column instead, which the storefront ignores
  // whenever product_colors rows exist, so sales never reduced visible
  // stock. Conditional updateMany also makes this safe under concurrency.
  if (color_name) {
    const colorHit = await prisma.productColor.updateMany({
      where: {
        product_id: id,
        quantity: { gte: qty },
        OR: [{ name: color_name }, { code: color_name }],
      },
      data: { quantity: { decrement: qty } },
    });
    if (colorHit.count === 0) {
      return res.status(422).json({
        success: false,
        message: "Color not found or insufficient stock for color",
      });
    }
  }

  const stockHit = await prisma.product.updateMany({
    where: { id, quantity: { gte: qty } },
    data: {
      quantity: { decrement: qty },
      sold: { increment: qty },
    },
  });
  if (stockHit.count === 0) {
    return res
      .status(422)
      .json({ success: false, message: "Insufficient stock" });
  }

  const updated = await prisma.product.findUnique({ where: { id } });
  res.json({ success: true, message: "Sales added", product: updated });
});

// Recomputes a product's public rating from its real reviews. This never
// trusts a rating value from the request body - review.controller.js already
// keeps product.rating in sync on every review create/update/delete the same
// way, so this endpoint (used for manual resync) must match that: any
// caller-supplied rating would let someone set a product's rating with zero
// real reviews behind it.
export const addRating = asyncHandler(async (req, res) => {
  const id = BigInt(req.params.id);

  const agg = await prisma.review.aggregate({
    where: { product_id: id },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const product = await prisma.product.update({
    where: { id },
    data: { rating: agg._avg.rating ?? 0 },
    select: { id: true, rating: true },
  });
  res.json({
    success: true,
    message: "Rating updated",
    product: {
      id: product.id.toString(),
      rating: product.rating,
      number_of_ratings: agg._count.rating || 0,
    },
  });
});

export const getSimilarProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 6 } = req.query;

  // Get the current product
  const currentProduct = await prisma.product.findFirst({
    where: { id: BigInt(id), deleted_at: null },
    select: { id: true, description: true, category_id: true },
  });

  if (!currentProduct) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (
    !currentProduct.description ||
    currentProduct.description.trim() === ""
  ) {
    // If no description, fallback to category-based similarity
    const similarProducts = await prisma.product.findMany({
      where: {
        category_id: currentProduct.category_id,
        id: { not: BigInt(id) },
        deleted_at: null,
        ...buyerVisibilityWhere(req),
      },
      include: { product_colors: true, shop: { select: shopSelect } },
      orderBy: { rating: "desc" },
      take: clampLimit(limit, 6),
    });

    const productsWithCalculations = similarProducts.map(
      calculateProductPrices
    );
    return res.json({
      products: productsWithCalculations,
      similarity_method: "category_based",
    });
  }

  // Use pg_trgm for description similarity
  // First, ensure pg_trgm extension is enabled (this should be done in migration)
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
  } catch (error) {
    console.log(
      "pg_trgm extension might already exist or permission denied:",
      error.message
    );
  }

  // Find similar products using trigram similarity
  // similarity() function returns a value between 0 and 1, where 1 is identical
  const similarProducts = await prisma.$queryRaw`
    SELECT
      p.id,
      p.name,
      p.price,
      p.discount,
      p.quantity,
      p.img,
      p.specs,
      p.specs_detail,
      p.color,
      p.shop_id,
      p.category_id,
      p.sub_category_id,
      p.rating,
      p.sold,
      p.description,
      p.created_at,
      p.updated_at,
      similarity(p.description, ${
        currentProduct.description
      }) as similarity_score
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE p.id != ${BigInt(id)}
      AND p.deleted_at IS NULL
      AND s.status = 'active'
      AND s.deleted_at IS NULL
      AND p.description IS NOT NULL
      AND p.description != ''
      AND similarity(p.description, ${currentProduct.description}) > 0.1
    ORDER BY similarity_score DESC, p.rating DESC NULLS LAST
    LIMIT ${Number(limit)};
  `;

  // If no similar products found by description, fallback to category
  if (similarProducts.length === 0) {
    const categoryProducts = await prisma.product.findMany({
      where: {
        category_id: currentProduct.category_id,
        id: { not: BigInt(id) },
        deleted_at: null,
        ...buyerVisibilityWhere(req),
      },
      include: { product_colors: true, shop: { select: shopSelect } },
      orderBy: { rating: "desc" },
      take: clampLimit(limit, 6),
    });

    const productsWithCalculations = categoryProducts.map(
      calculateProductPrices
    );
    return res.json({
      products: productsWithCalculations,
      similarity_method: "category_fallback",
    });
  }

  // Get product colors for similar products
  const productIds = similarProducts.map((p) => p.id);
  const productColors = await prisma.productColor.findMany({
    where: { product_id: { in: productIds } },
  });

  // Group colors by product_id
  const colorsByProduct = productColors.reduce((acc, color) => {
    const productId = color.product_id.toString();
    if (!acc[productId]) acc[productId] = [];
    acc[productId].push(color);
    return acc;
  }, {});

  // Add product_colors to each product and calculate prices
  const productsWithColors = similarProducts.map((product) => ({
    ...product,
    id: product.id.toString(), // Convert BigInt to string for JSON serialization
    category_id: product.category_id.toString(),
    sub_category_id: product.sub_category_id?.toString() || null,
    product_colors: colorsByProduct[product.id.toString()] || [],
  }));

  const productsWithCalculations = productsWithColors.map(
    calculateProductPrices
  );

  res.json({
    products: productsWithCalculations,
    similarity_method: "description_based",
    similarity_threshold: 0.1,
  });
});
