import { prisma } from "../lib/db.js";
import { parsePagination } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { couponStatus, previewCouponDiscount } from "../services/pricing.service.js";
import {
  listWarehouse,
  listClaimable,
  listShopPublicCoupons,
  listCheckoutCandidates,
  claimCoupon as claimCouponService,
  unclaimCoupon as unclaimCouponService,
  findWarehouseCouponByCode,
} from "../services/coupon.service.js";

const couponShopSelect = { id: true, name: true, slug: true };

// Ma loi cua pricing/coupon service -> ma HTTP
const statusForCode = (code) =>
  code === "COUPON_NOT_FOUND" ? 404 : code === "COUPON_NOT_OWNED" ? 403 : 400;

/**
 * Doc cac truong voucher sua duoc tu body. undefined = giu nguyen; "" / null =
 * xoa (cot cho phep null). Tra { error } khi gia tri sai.
 */
const couponFieldsFromBody = (body) => {
  const data = {};
  const nullableNum = (v) => (v === "" || v === null ? null : Number(v));
  if (body.description !== undefined) data.description = body.description;
  if (body.discount_type !== undefined) {
    if (!["percent", "fixed"].includes(body.discount_type)) {
      return { error: "discount_type must be percent or fixed" };
    }
    data.discount_type = body.discount_type;
  }
  if (body.discount_value !== undefined) data.discount_value = Number(body.discount_value);
  for (const k of ["min_order", "max_discount", "usage_limit"]) {
    if (body[k] !== undefined) data[k] = nullableNum(body[k]);
  }
  for (const k of ["starts_at", "expires_at"]) {
    if (body[k] !== undefined) data[k] = body[k] ? new Date(body[k]) : null;
  }
  if (body.is_active !== undefined) {
    data.is_active = body.is_active === true || body.is_active === "true";
  }

  if (
    data.discount_value !== undefined &&
    !(Number.isFinite(data.discount_value) && data.discount_value > 0)
  ) {
    return { error: "discount_value must be a positive number" };
  }
  for (const k of ["min_order", "max_discount", "usage_limit"]) {
    if (data[k] != null && !(Number.isFinite(data[k]) && data[k] >= 0)) {
      return { error: `${k} must be a non-negative number` };
    }
  }
  for (const k of ["starts_at", "expires_at"]) {
    if (data[k] && Number.isNaN(data[k].getTime())) {
      return { error: `${k} is not a valid date` };
    }
  }
  return { data };
};

// Kiem tra cheo sau khi gop voi ban ghi cu (sua mot phan van phai hop le)
const crossCheck = (merged) => {
  if (merged.discount_type === "percent" && Number(merged.discount_value) > 100) {
    return "Percent discount cannot exceed 100";
  }
  if (
    merged.starts_at &&
    merged.expires_at &&
    new Date(merged.starts_at) >= new Date(merged.expires_at)
  ) {
    return "starts_at must be before expires_at";
  }
  return null;
};

export const createCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const parsed = couponFieldsFromBody({
    discount_type: "percent",
    usage_limit: 1,
    ...req.body,
  });
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  if (!code || parsed.data.discount_value === undefined) {
    return res.status(400).json({ message: "code and discount_value are required" });
  }
  const crossError = crossCheck(parsed.data);
  if (crossError) return res.status(400).json({ message: crossError });

  const existingCoupon = await prisma.coupon.findFirst({
    where: { code, deleted_at: null },
  });
  if (existingCoupon) {
    return res.status(400).json({ message: "Coupon code already exists" });
  }

  const savedCoupon = await prisma.coupon.create({
    data: { ...parsed.data, code },
  });
  res.status(201).json({
    message: "Coupon created successfully",
    coupon: savedCoupon,
  });
});

// Xem truoc voucher. Body: { code, amount, shop_amounts? } - amount la tien hang
// sau uu dai hang; shop_amounts ({shopId: tien}) de kiem pham vi voucher shop.
const respondPreview = (res, coupon, { amount, shop_amounts }, userId) => {
  const outcome = previewCouponDiscount({
    coupon,
    amount,
    shopAmounts: shop_amounts,
    userId,
  });
  if (!outcome.ok) {
    return res
      .status(statusForCode(outcome.code))
      .json({ message: outcome.message, code: outcome.code });
  }
  const { users: _users, ...publicCoupon } = coupon;
  return res.json({
    valid: true,
    coupon: publicCoupon,
    discount: outcome.couponDiscount,
    finalAmount: Number(amount) - outcome.couponDiscount,
  });
};

export const validateCoupon = asyncHandler(async (req, res) => {
  const coupon = await prisma.coupon.findFirst({
    where: { code: req.body.code, deleted_at: null },
    include: { shop: { select: couponShopSelect }, users: { select: { id: true } } },
  });
  return respondPreview(res, coupon, req.body, req.user?.id);
});

export const getMyCoupons = asyncHandler(async (req, res) => {
  const coupons = await listWarehouse(req.user.id);
  return res.json({ success: true, data: { coupons } });
});

export const validateMyCoupon = asyncHandler(async (req, res) => {
  const coupon = await findWarehouseCouponByCode(req.user.id, req.body.code);
  if (!coupon) {
    return res.status(404).json({ message: "Voucher not found in your warehouse" });
  }
  return respondPreview(res, coupon, req.body, req.user.id);
});

// POST /api/coupons/quote - voucher cho gio hang hien tai: kho + voucher luu duoc
// cua san va cac shop trong gio, moi cai kem applicable/discount/reason.
export const quoteCoupons = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const shopAmounts =
    req.body.shop_amounts && typeof req.body.shop_amounts === "object"
      ? req.body.shop_amounts
      : {};
  const shopIds = Object.keys(shopAmounts).filter((id) => /^\d+$/.test(id));
  const candidates = await listCheckoutCandidates({ userId: req.user.id, shopIds });
  const coupons = candidates.map((coupon) => {
    const outcome = previewCouponDiscount({
      coupon,
      amount,
      shopAmounts,
      userId: req.user.id,
    });
    return {
      ...coupon,
      applicable: outcome.ok,
      discount: outcome.ok ? outcome.couponDiscount : 0,
      reason: outcome.ok ? null : outcome.message,
      reason_code: outcome.ok ? null : outcome.code,
    };
  });
  res.json({ success: true, data: { coupons } });
});

// GET /api/coupons/claimable?shop_id= - voucher cong khai cua san (+ shop neu co)
export const getClaimableCoupons = asyncHandler(async (req, res) => {
  const shopId = String(req.query.shop_id || "");
  if (shopId && !/^\d+$/.test(shopId)) {
    return res.status(400).json({ message: "Invalid shop_id" });
  }
  const coupons = await listClaimable({
    userId: req.user?.id,
    shopIds: shopId ? [shopId] : [],
  });
  res.json({ success: true, data: { coupons } });
});

const CLAIM_ERROR_STATUS = { COUPON_NOT_FOUND: 404, COUPON_RESTRICTED: 403 };

// POST /api/coupons/:id/claim - luu voucher cong khai vao kho (idempotent)
export const claimCoupon = asyncHandler(async (req, res) => {
  const outcome = await claimCouponService({
    userId: req.user.id,
    couponId: req.params.id,
  });
  if (!outcome.ok) {
    return res
      .status(CLAIM_ERROR_STATUS[outcome.code] || 400)
      .json({ message: outcome.message, code: outcome.code });
  }
  res.json({ success: true, message: "Voucher saved", data: { claimed: true } });
});

// DELETE /api/coupons/:id/claim - bo voucher da luu khoi kho
export const unclaimCoupon = asyncHandler(async (req, res) => {
  await unclaimCouponService({ userId: req.user.id, couponId: req.params.id });
  res.json({ success: true, data: { claimed: false } });
});

export const getAllCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, q, scope } = req.query;

  const where = { deleted_at: null };
  if (q) {
    where.code = { contains: String(q), mode: "insensitive" };
  }
  if (scope === "platform") where.shop_id = null;
  if (scope === "shop") where.shop_id = { not: null };

  const { skip, take } = parsePagination(page, limit);

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: { shop: { select: couponShopSelect } },
      skip,
      take,
    }),
    prisma.coupon.count({ where }),
  ]);

  const now = new Date();
  res.json({
    coupons: coupons.map((c) => ({ ...c, status: couponStatus(c, now) })),
    pagination: {
      current_page: Number(page),
      per_page: Number(limit),
      total_count: total,
      total_pages: Math.max(1, Math.ceil(total / Number(limit))),
    },
  });
});

export const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await prisma.coupon.findFirst({
    where: { id: BigInt(req.params.id), deleted_at: null },
  });
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  res.json(coupon);
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const parsed = couponFieldsFromBody(req.body);
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  const coupon = await prisma.coupon.findFirst({
    where: { id: BigInt(req.params.id), deleted_at: null },
  });
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }
  const crossError = crossCheck({ ...coupon, ...parsed.data });
  if (crossError) return res.status(400).json({ message: crossError });

  if (code && code !== coupon.code) {
    const exists = await prisma.coupon.findFirst({
      where: { code, deleted_at: null },
    });
    if (exists)
      return res.status(400).json({ message: "Coupon code already exists" });
  }

  const updatedCoupon = await prisma.coupon.update({
    where: { id: BigInt(req.params.id) },
    data: { ...parsed.data, code: code || undefined },
  });

  res.json({ message: "Coupon updated successfully", coupon: updatedCoupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await prisma.coupon.findFirst({
    where: { id: BigInt(req.params.id), deleted_at: null },
  });
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  await prisma.coupon.update({
    where: { id: BigInt(req.params.id) },
    data: { deleted_at: new Date() },
  });
  res.json({ message: "Coupon deleted successfully" });
});

// GET /api/coupons/shop/:slug — public: a shop's collectible vouchers (+ claimed flag)
export const getShopCoupons = asyncHandler(async (req, res) => {
  const coupons = await listShopPublicCoupons({
    slug: req.params.slug,
    userId: req.user?.id,
  });
  res.json({ success: true, data: { coupons } });
});

// GET /api/coupons/shop/mine/list — seller: own shop's vouchers
export const getMyShopCoupons = asyncHandler(async (req, res) => {
  if (!req.shop) {
    return res.status(400).json({ message: "No shop attached to this account" });
  }
  const coupons = await prisma.coupon.findMany({
    where: { shop_id: req.shop.id, deleted_at: null },
    orderBy: { created_at: "desc" },
  });
  const now = new Date();
  res.json({ coupons: coupons.map((c) => ({ ...c, status: couponStatus(c, now) })) });
});

// POST /api/coupons/shop — seller creates a voucher for their own shop
export const createShopCoupon = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(400).json({ message: "No shop attached to this account" });
    }
    const { code } = req.body;
    const parsed = couponFieldsFromBody({
      discount_type: "percent",
      usage_limit: 100,
      ...req.body,
    });
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    if (!code || !parsed.data.discount_value) {
      return res
        .status(400)
        .json({ message: "code and discount_value are required" });
    }
    const crossError = crossCheck(parsed.data);
    if (crossError) return res.status(400).json({ message: crossError });

    // Normalize once and use it for both the duplicate check and the
    // insert - checking the raw body value let a case-differing code
    // (e.g. "save10" vs "SAVE10") slip past this check and hit the
    // unique-constraint error below instead.
    const normalizedCode = String(code).toUpperCase().trim();

    const existingCoupon = await prisma.coupon.findFirst({
      where: { code: normalizedCode, deleted_at: null },
    });
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const savedCoupon = await prisma.coupon.create({
      data: {
        ...parsed.data,
        code: normalizedCode,
        shop_id: req.shop.id,
      },
    });
    res.status(201).json({
      message: "Shop voucher created successfully",
      coupon: savedCoupon,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Coupon code already exists" });
    }
    res
      .status(500)
      .json({ message: "Failed to create shop voucher", error: error.message });
  }
};

// PUT /api/coupons/shop/:id — seller edits / pauses / resumes their own shop's
// voucher. Ma voucher va pham vi shop khong doi duoc.
export const updateShopCoupon = asyncHandler(async (req, res) => {
  if (!req.shop) {
    return res.status(400).json({ message: "No shop attached to this account" });
  }
  const parsed = couponFieldsFromBody(req.body);
  if (parsed.error) return res.status(400).json({ message: parsed.error });

  const coupon = await prisma.coupon.findFirst({
    where: { id: BigInt(req.params.id), deleted_at: null },
  });
  if (!coupon || coupon.shop_id?.toString() !== req.shop.id.toString()) {
    return res.status(404).json({ message: "Coupon not found" });
  }
  const crossError = crossCheck({ ...coupon, ...parsed.data });
  if (crossError) return res.status(400).json({ message: crossError });

  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: parsed.data,
  });
  res.json({
    message: "Shop voucher updated successfully",
    coupon: { ...updated, status: couponStatus(updated) },
  });
});

// DELETE /api/coupons/shop/:id — seller deletes their own shop's voucher
export const deleteShopCoupon = asyncHandler(async (req, res) => {
  if (!req.shop) {
    return res.status(400).json({ message: "No shop attached to this account" });
  }
  const coupon = await prisma.coupon.findFirst({
    where: { id: BigInt(req.params.id), deleted_at: null },
  });
  if (!coupon || coupon.shop_id?.toString() !== req.shop.id.toString()) {
    return res.status(404).json({ message: "Coupon not found" });
  }
  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { deleted_at: new Date() },
  });
  res.json({ message: "Shop voucher deleted successfully" });
});
