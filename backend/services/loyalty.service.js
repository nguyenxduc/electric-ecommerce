// Quy tac khach hang than thiet: hang thanh vien, tich diem, thu hoi diem,
// va voucher tang khi len hang.
//
// Truoc day toan bo phan nay nam trong controllers/loyalty.controller.js.
// order.controller va return.controller phai import nguoc ra tu do moi cong
// va tru duoc diem - controller phu thuoc controller la huong phu thuoc sai,
// va keo ca tang HTTP vao nhung cho khong can den no.
//
// Cac ham nhan tham so `tx` chu khong tu mo giao dich: nguoi goi quyet dinh
// ranh gioi giao dich, nho vay cong diem va tao don nam tron trong cung mot
// giao dich, khong the xay ra canh don tao xong ma diem thi khong cong.

import { prisma } from "../lib/db.js";

// Earn rule: POINTS_PER_UNIT per UNIT_AMOUNT spent (USD, same as order totals)
export const POINTS_PER_UNIT = Number(process.env.LOYALTY_POINTS_PER_UNIT || 1);
export const UNIT_AMOUNT = Number(process.env.LOYALTY_UNIT_AMOUNT || 100); // đơn vị tiền (cùng currency với order.total_amount)
export const MIN_REDEEM_POINTS = Number(process.env.LOYALTY_MIN_REDEEM_POINTS || 100);

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

/** Min order uses same currency as catalog/checkout (USD in seed). */
export const UPGRADE_VOUCHERS = {
  SILVER: { discount_type: "percent", discount_value: 5, min_order: 300, expires_in_days: 30 },
  GOLD: { discount_type: "percent", discount_value: 10, min_order: 500, expires_in_days: 45 },
  PLATINUM: { discount_type: "percent", discount_value: 15, min_order: 700, expires_in_days: 60 },
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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rewardCfg.expires_in_days);

    if (!couponId) {
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
    } else {
      await tx.coupon.update({
        where: { id: couponId },
        data: {
          discount_type: rewardCfg.discount_type,
          discount_value: rewardCfg.discount_value,
          min_order: rewardCfg.min_order,
          expires_at: expiresAt,
        },
      });
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

export const REDEEM_POINTS_PER_DOLLAR = Number(process.env.LOYALTY_REDEEM_POINTS_PER_DOLLAR || 100);

// Đổi điểm lấy voucher giảm giá
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

// Hàm dùng nội bộ: thu hồi điểm đã cộng khi đơn bị hủy/trả hàng.
// Idempotent: nếu đơn đã bị thu hồi điểm rồi thì bỏ qua.
// (Voucher thăng hạng đã tặng thì không thu hồi - chấp nhận được.)
export const revertPointsForOrder = async (tx, userIdBigInt, orderIdBigInt) => {
  const [earned, alreadyReverted] = await Promise.all([
    tx.loyaltyPointTransaction.aggregate({
      _sum: { points: true },
      where: { order_id: orderIdBigInt, user_id: userIdBigInt, type: "EARN" },
    }),
    tx.loyaltyPointTransaction.findFirst({
      where: { order_id: orderIdBigInt, user_id: userIdBigInt, type: "ADJUST" },
    }),
  ]);

  const earnedPoints = earned._sum.points || 0;
  if (earnedPoints <= 0 || alreadyReverted) return;

  const user = await tx.user.findUnique({
    where: { id: userIdBigInt },
    select: { loyalty_points: true },
  });
  if (!user) return;

  const deduct = Math.min(earnedPoints, user.loyalty_points || 0);
  const nextPoints = (user.loyalty_points || 0) - deduct;

  await tx.loyaltyPointTransaction.create({
    data: {
      user_id: userIdBigInt,
      order_id: orderIdBigInt,
      points: -deduct,
      type: "ADJUST",
      description: "Revert points from cancelled/returned order",
    },
  });

  await tx.user.update({
    where: { id: userIdBigInt },
    data: {
      loyalty_points: nextPoints,
      segment: getTierByPoints(nextPoints).key,
    },
  });
};

