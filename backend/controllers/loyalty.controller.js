import { prisma } from "../lib/db.js";

// Quy tắc tích điểm đơn giản: 1 điểm cho mỗi 100.000 VND (hoặc 100 USD tuỳ cấu hình)
const POINTS_PER_UNIT = Number(process.env.LOYALTY_POINTS_PER_UNIT || 1);
const UNIT_AMOUNT = Number(process.env.LOYALTY_UNIT_AMOUNT || 100); // đơn vị tiền (cùng currency với order.total_amount)

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

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id.toString(),
          name: user.name,
          loyalty_points: user.loyalty_points,
          segment: user.segment,
        },
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
    const { points, description } = req.body || {};

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: "Số điểm phải lớn hơn 0",
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

      return tx.user.update({
        where: { id: userId },
        data: {
          loyalty_points: { decrement: points },
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

  const points = Math.floor((amount / UNIT_AMOUNT) * POINTS_PER_UNIT);
  if (points <= 0) return;

  await tx.loyaltyPointTransaction.create({
    data: {
      user_id: userIdBigInt,
      order_id: orderIdBigInt,
      points,
      type: "EARN",
      description: "Earn points from order",
    },
  });

  await tx.user.update({
    where: { id: userIdBigInt },
    data: {
      loyalty_points: { increment: points },
    },
  });
};

