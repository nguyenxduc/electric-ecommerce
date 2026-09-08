import { prisma } from "../lib/db.js";
import { SHOP_STATUS } from "../constants/status.js";

const computeCouponDiscount = (coupon, amount) => {
  if (coupon.discount_type === "percent") {
    return (Number(amount) * Number(coupon.discount_value)) / 100;
  }
  return Number(coupon.discount_value);
};

const couponShopSelect = { id: true, name: true, slug: true };

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discount_type = "percent",
      discount_value,
      min_order,
      usage_limit = 1,
      expires_at,
    } = req.body;

    const existingCoupon = await prisma.coupon.findFirst({
      where: { code, deleted_at: null },
    });
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const savedCoupon = await prisma.coupon.create({
      data: {
        code,
        description,
        discount_type,
        discount_value,
        min_order,
        usage_limit,
        expires_at: expires_at ? new Date(expires_at) : null,
      },
    });
    res.status(201).json({
      message: "Coupon created successfully",
      coupon: savedCoupon,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create coupon", error: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;

    const coupon = await prisma.coupon.findFirst({
      where: { code, deleted_at: null },
      include: { shop: { select: couponShopSelect } },
    });
    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    const now = new Date();
    if (coupon.expires_at && now > coupon.expires_at) {
      return res.status(400).json({ message: "Coupon has expired" });
    }
    if (
      coupon.usage_limit !== null &&
      coupon.used_count !== null &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }
    if (coupon.min_order && Number(amount) < Number(coupon.min_order)) {
      return res
        .status(400)
        .json({ message: "Order does not meet minimum amount" });
    }

    const discount = computeCouponDiscount(coupon, amount);

    res.json({
      valid: true,
      coupon,
      discount,
      finalAmount: Number(amount) - discount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to validate coupon", error: error.message });
  }
};

export const getMyCoupons = async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        coupons: {
          where: {
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    const coupons = (user?.coupons || []).map((coupon) => {
      const isExpired = !!(coupon.expires_at && now > coupon.expires_at);
      const isExhausted =
        coupon.usage_limit != null &&
        coupon.used_count != null &&
        coupon.used_count >= coupon.usage_limit;
      return {
        ...coupon,
        is_expired: isExpired,
        is_exhausted: isExhausted,
        is_usable: !isExpired && !isExhausted,
      };
    });

    return res.json({
      success: true,
      data: {
        coupons,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to get my vouchers", error: error.message });
  }
};

export const validateMyCoupon = async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { code, amount } = req.body;

    const coupon = await prisma.coupon.findFirst({
      where: {
        code,
        deleted_at: null,
        users: { some: { id: userId } },
      },
      include: { shop: { select: couponShopSelect } },
    });

    if (!coupon) {
      return res.status(404).json({ message: "Voucher not found in your warehouse" });
    }

    const now = new Date();
    if (coupon.expires_at && now > coupon.expires_at) {
      return res.status(400).json({ message: "Coupon has expired" });
    }
    if (
      coupon.usage_limit !== null &&
      coupon.used_count !== null &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }
    if (coupon.min_order && Number(amount) < Number(coupon.min_order)) {
      return res
        .status(400)
        .json({ message: "Order does not meet minimum amount" });
    }

    const discount = computeCouponDiscount(coupon, amount);

    return res.json({
      valid: true,
      coupon,
      discount,
      finalAmount: Number(amount) - discount,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to validate my voucher", error: error.message });
  }
};

export const getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, q } = req.query;

    const where = { deleted_at: null };
    if (q) {
      where.code = { contains: String(q), mode: "insensitive" };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
      }),
      prisma.coupon.count({ where }),
    ]);

    res.json({
      coupons,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total_count: total,
        total_pages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get coupons", error: error.message });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const coupon = await prisma.coupon.findFirst({
      where: { id: BigInt(req.params.id), deleted_at: null },
    });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json(coupon);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get coupon", error: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_order,
      usage_limit,
      expires_at,
    } = req.body;

    const coupon = await prisma.coupon.findFirst({
      where: { id: BigInt(req.params.id), deleted_at: null },
    });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    if (code && code !== coupon.code) {
      const exists = await prisma.coupon.findFirst({
        where: { code, deleted_at: null },
      });
      if (exists)
        return res.status(400).json({ message: "Coupon code already exists" });
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id: BigInt(req.params.id) },
      data: {
        code: code ?? undefined,
        description: description ?? undefined,
        discount_type: discount_type ?? undefined,
        discount_value: discount_value ?? undefined,
        min_order: min_order ?? undefined,
        usage_limit: usage_limit ?? undefined,
        expires_at: expires_at ? new Date(expires_at) : undefined,
      },
    });

    res.json({ message: "Coupon updated successfully", coupon: updatedCoupon });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update coupon", error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete coupon", error: error.message });
  }
};

// GET /api/coupons/shop/:slug — public: a shop's usable vouchers (shop page display)
export const getShopCoupons = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        deleted_at: null,
        shop: {
          slug: req.params.slug,
          status: SHOP_STATUS.ACTIVE,
          deleted_at: null,
        },
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
        // personal vouchers (assigned to users) are not publicly listed
        users: { none: {} },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    const usable = coupons.filter(
      (c) =>
        c.usage_limit == null ||
        c.used_count == null ||
        c.used_count < c.usage_limit
    );

    res.json({ success: true, data: { coupons: usable } });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get shop coupons", error: error.message });
  }
};

// GET /api/coupons/shop/mine/list — seller: own shop's vouchers
export const getMyShopCoupons = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(400).json({ message: "No shop attached to this account" });
    }
    const coupons = await prisma.coupon.findMany({
      where: { shop_id: req.shop.id, deleted_at: null },
      orderBy: { created_at: "desc" },
    });
    res.json({ coupons });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get shop coupons", error: error.message });
  }
};

// POST /api/coupons/shop — seller creates a voucher for their own shop
export const createShopCoupon = async (req, res) => {
  try {
    if (!req.shop) {
      return res.status(400).json({ message: "No shop attached to this account" });
    }
    const {
      code,
      description,
      discount_type = "percent",
      discount_value,
      min_order,
      usage_limit = 100,
      expires_at,
    } = req.body;

    if (!code || !discount_value) {
      return res
        .status(400)
        .json({ message: "code and discount_value are required" });
    }

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
        code: normalizedCode,
        description,
        discount_type,
        discount_value,
        min_order,
        usage_limit,
        shop_id: req.shop.id,
        expires_at: expires_at ? new Date(expires_at) : null,
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

// DELETE /api/coupons/shop/:id — seller deletes their own shop's voucher
export const deleteShopCoupon = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete shop voucher", error: error.message });
  }
};
