import { prisma } from "../lib/db.js";

// Quy tắc tích điểm đơn giản: 1 điểm cho mỗi 100.000 VND (hoặc 100 USD tuỳ cấu hình)
const POINTS_PER_UNIT = Number(process.env.LOYALTY_POINTS_PER_UNIT || 1);
const UNIT_AMOUNT = Number(process.env.LOYALTY_UNIT_AMOUNT || 100); // đơn vị tiền (cùng currency với order.total_amount)
const MIN_REDEEM_POINTS = Number(process.env.LOYALTY_MIN_REDEEM_POINTS || 50);

export const TIERS = [
  {
    key: "BRONZE",
    label: "Bronze",
    min: 0,
    max: 499,
    multiplier: 1,
    benefits: ["Tich diem co ban", "Uu dai sinh nhat nhe"],
  },
  {
    key: "SILVER",
    label: "Silver",
    min: 500,
    max: 1999,
    multiplier: 1.1,
    benefits: ["Nhanh diem +10%", "Uu tien CSKH", "Voucher theo mua"],
  },
  {
    key: "GOLD",
    label: "Gold",
    min: 2000,
    max: 4999,
    multiplier: 1.25,
    benefits: ["Nhanh diem +25%", "Voucher gia tri cao", "Uu tien giao hang"],
  },
  {
    key: "PLATINUM",
    label: "Platinum",
    min: 5000,
    max: Infinity,
    multiplier: 1.5,
    benefits: ["Nhanh diem +50%", "CSKH uu tien cao nhat", "Qua tang doc quyen"],
  },
];

export const getTierByPoints = (points) =>
  TIERS.find((tier) => points >= tier.min && points <= tier.max) || TIERS[0];

const getTierIndex = (tierKey) => TIERS.findIndex((tier) => tier.key === tierKey);

const UPGRADE_VOUCHERS = {
  SILVER: { discount_type: "percent", discount_value: 5, min_order: 300000, expires_in_days: 30 },
  GOLD: { discount_type: "percent", discount_value: 10, min_order: 500000, expires_in_days: 45 },
  PLATINUM: { discount_type: "percent", discount_value: 15, min_order: 700000, expires_in_days: 60 },
};

export const grantUpgradeVouchers = async (tx, userIdBigInt, fromTierKey, toTierKey) => {
  const fromIdx = Math.max(0, getTierIndex(fromTierKey));
  const toIdx = getTierIndex(toTierKey);
  if (toIdx <= fromIdx) return [];

  const granted = [];
  const userIdText = userIdBigInt.toString();

  for (let idx = fromIdx + 1; idx <= toIdx; idx += 1) {
    const tier = TIERS[idx];
    const rewardCfg = UPGRADE_VOUCHERS[tier.key];
    if (!rewardCfg) continue;

    const code = `UP-${tier.key}-U${userIdText}`;
    const existingCoupon = await tx.coupon.findFirst({
      where: { code, deleted_at: null },
      select: { id: true },
    });

    let couponId = existingCoupon?.id;
    if (!couponId) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rewardCfg.expires_in_days);
      const created = await tx.coupon.create({
        data: {
          code,
          description: `Tier upgrade reward - ${tier.label}`,
          discount_type: rewardCfg.discount_type,
          discount_value: rewardCfg.discount_value,
          min_order: rewardCfg.min_order,
          usage_limit: 1,
          expires_at: expiresAt,
        },
      });
      couponId = created.id;
    }

    await tx.user.update({
      where: { id: userIdBigInt },
      data: {
        coupons: {
          connect: { id: couponId },
        },
      },
    });

    granted.push({
      tier: tier.key,
      code,
      discount_type: rewardCfg.discount_type,
      discount_value: rewardCfg.discount_value,
    });
  }

  return granted;
};

export const getLoyaltySummary = async (req, res) => {
  try {
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
    const tier = getTierByPoints(points);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id.toString(),
          name: user.name,
          loyalty_points: points,
          segment: user.segment || tier.key,
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
        reward_vouchers: user.coupons,
        transactions,
      },
    });
  } catch (error) {
    console.error("getLoyaltySummary error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tải thông tin tích điểm",
    });
  }
};

// Đổi điểm lấy quà / voucher (logic đơn giản: trừ điểm)
export const redeemPoints = async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { points: rawPoints, description } = req.body || {};
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
        error: `Phai doi toi thieu ${MIN_REDEEM_POINTS} diem`,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, loyalty_points: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.loyalty_points < points) {
      return res.status(400).json({
        success: false,
        error: "Điểm không đủ để đổi quà",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.loyaltyPointTransaction.create({
        data: {
          user_id: userId,
          points: -points,
          type: "REDEEM",
          description: description?.trim() || "Redeem reward",
        },
      });

      const nextPoints = user.loyalty_points - points;
      const nextTier = getTierByPoints(nextPoints);

      return tx.user.update({
        where: { id: userId },
        data: {
          loyalty_points: { decrement: points },
          segment: nextTier.key,
        },
      });
    });

    return res.json({
      success: true,
      message: "Đổi điểm thành công",
      data: {
        loyalty_points: updated.loyalty_points,
      },
    });
  } catch (error) {
    console.error("redeemPoints error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể đổi điểm",
    });
  }
};

// Hàm dùng nội bộ: cộng điểm khi đơn hàng hoàn tất
export const earnPointsForOrder = async (tx, userIdBigInt, orderIdBigInt, amountDecimal) => {
  const amount = Number(amountDecimal || 0);
  if (amount <= 0 || !UNIT_AMOUNT || !POINTS_PER_UNIT) return;

  const user = await tx.user.findUnique({
    where: { id: userIdBigInt },
    select: { loyalty_points: true },
  });
  if (!user) return;

  const currentPoints = user.loyalty_points || 0;
  const currentTier = getTierByPoints(currentPoints);
  const basePoints = Math.floor((amount / UNIT_AMOUNT) * POINTS_PER_UNIT);
  const points = Math.floor(basePoints * currentTier.multiplier);
  if (points <= 0) return;

  const nextPoints = currentPoints + points;
  const nextTier = getTierByPoints(nextPoints);
  await grantUpgradeVouchers(tx, userIdBigInt, currentTier.key, nextTier.key);

  await tx.loyaltyPointTransaction.create({
    data: {
      user_id: userIdBigInt,
      order_id: orderIdBigInt,
      points,
      type: "EARN",
      description: `Earn points from order (${currentTier.label} x${currentTier.multiplier})`,
    },
  });

  await tx.user.update({
    where: { id: userIdBigInt },
    data: {
      loyalty_points: { increment: points },
      segment: nextTier.key,
    },
  });
};

