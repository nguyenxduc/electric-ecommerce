// Bo chuyen doi HTTP cho chuong trinh khach hang than thiet.
// Moi quy tac nghiep vu nam o services/loyalty.service.js.

import { prisma } from "../lib/db.js";
import {
  TIERS,
  getTierByPoints,
  POINTS_PER_UNIT,
  UNIT_AMOUNT,
  MIN_REDEEM_POINTS,
  REDEEM_POINTS_PER_DOLLAR,
} from "../services/loyalty.service.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const getLoyaltySummary = asyncHandler(async (req, res) => {
  const userId = BigInt(req.user.id);

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        loyalty_points: true,
        segment: true,
        coupons: {
          where: {
            description: { contains: "Tier upgrade reward", mode: "insensitive" },
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            code: true,
            description: true,
            discount_type: true,
            discount_value: true,
            min_order: true,
            expires_at: true,
            created_at: true,
          },
          take: 10,
        },
      },
    }),
    prisma.loyaltyPointTransaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
  ]);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const points = user.loyalty_points || 0;
  // Tier is determined by stored segment (set only when earning points, never decremented on redeem)
  // Fall back to points-based calculation only if segment hasn't been set yet
  const tierFromSegment = user.segment ? TIERS.find(t => t.key === user.segment) : null;
  const tier = tierFromSegment || getTierByPoints(points);

  return res.json({
    success: true,
    data: {
      user: {
        id: user.id.toString(),
        name: user.name,
        loyalty_points: points,
        segment: tier.key,
      },
      tier: {
        key: tier.key,
        label: tier.label,
        min: tier.min,
        max: tier.max,
        multiplier: tier.multiplier,
        benefits: tier.benefits,
      },
      point_policy: {
        unit_amount: UNIT_AMOUNT,
        points_per_unit: POINTS_PER_UNIT,
        min_redeem_points: MIN_REDEEM_POINTS,
      },
      reward_vouchers: user.coupons.map((c) => ({
        ...c,
        id: c.id?.toString?.() ?? c.id,
      })),
      transactions: transactions.map((t) => ({
        ...t,
        id: t.id?.toString?.() ?? t.id,
        user_id: t.user_id?.toString?.() ?? t.user_id,
        order_id: t.order_id?.toString?.() ?? t.order_id,
      })),
    },
  });
});

// Tỉ lệ quy đổi: REDEEM_POINTS_PER_DOLLAR điểm = $1 giảm giá
export const redeemPoints = asyncHandler(async (req, res) => {
  const userId = BigInt(req.user.id);
  const { points: rawPoints } = req.body || {};
  const points = Number.parseInt(rawPoints, 10);

  if (!Number.isInteger(points) || points <= 0) {
    return res.status(400).json({
      success: false,
      error: "Số điểm phải lớn hơn 0",
    });
  }
  if (points < MIN_REDEEM_POINTS) {
    return res.status(400).json({
      success: false,
      error: `Minimum redeem is ${MIN_REDEEM_POINTS} points`,
    });
  }
  if (points % REDEEM_POINTS_PER_DOLLAR !== 0) {
    return res.status(400).json({
      success: false,
      error: `Points must be a multiple of ${REDEEM_POINTS_PER_DOLLAR}`,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, loyalty_points: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  if (user.loyalty_points < points) {
    return res.status(400).json({
      success: false,
      error: "Điểm không đủ để đổi quà",
    });
  }

  const discountValue = Math.floor(points / REDEEM_POINTS_PER_DOLLAR);
  if (discountValue <= 0) {
    return res.status(400).json({
      success: false,
      error: `Cần ít nhất ${REDEEM_POINTS_PER_DOLLAR} điểm để đổi $1 giảm giá`,
    });
  }

  const userIdText = userId.toString();
  const timestamp = Date.now();
  const couponCode = `RD-${userIdText}-${timestamp}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const result = await prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.create({
      data: {
        code: couponCode,
        description: `Redeemed ${points} pts — $${discountValue} off`,
        discount_type: "fixed",
        discount_value: discountValue,
        min_order: 0,
        usage_limit: 1,
        expires_at: expiresAt,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { coupons: { connect: { id: coupon.id } } },
    });

    await tx.loyaltyPointTransaction.create({
      data: {
        user_id: userId,
        points: -points,
        type: "REDEEM",
        description: `Redeemed ${points} pts for voucher ${couponCode} ($${discountValue} off)`,
      },
    });

    // Tier is based on lifetime earned points, not current balance — do NOT downgrade on redeem
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { loyalty_points: { decrement: points } },
    });

    return { updatedUser, coupon };
  });

  return res.json({
    success: true,
    message: `Points redeemed! A $${discountValue} off voucher has been added to your warehouse.`,
    data: {
      loyalty_points: result.updatedUser.loyalty_points,
      voucher: {
        code: couponCode,
        discount_value: discountValue,
        discount_type: "fixed",
        expires_at: expiresAt,
      },
    },
  });
});

// Hàm dùng nội bộ: cộng điểm khi đơn hàng hoàn tất