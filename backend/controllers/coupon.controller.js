import { prisma } from "../lib/db.js";

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

    let discount = 0;
    if (coupon.discount_type === "percent") {
      discount = (Number(amount) * Number(coupon.discount_value)) / 100;
    } else {
      discount = Number(coupon.discount_value);
    }

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
