import { prisma } from "../lib/db.js";
import { ORDER_STATUS } from "../constants/status.js";
import { getSettingNumber } from "../lib/settings.js";
import { applyOrderListFilters } from "../lib/orderFilters.js";
import { round2 } from "./pricing.service.js";

// Phi san tren doanh thu cua seller. Dung chung cho dashboard seller
// ("All-time revenue / Platform fee / Net payout") va trang "My income".
export const getCommissionRate = () => getSettingNumber("platform_commission_rate", 0.05);

export const commissionOn = (amount, rate) => {
  const fee = round2(amount * rate);
  return { fee, net: round2(amount - fee) };
};

export const computeCommission = async (revenue) => {
  const rate = await getCommissionRate();
  return { rate, ...commissionOn(revenue, rate) };
};

// Thu nhap cua mot shop trong khoang ngay (from/to theo created_at cua don):
// released = don da giao (don tra hang co trang thai "returned" nen tu loai ra),
// pending = don dang xu ly/dang giao. Phi san tinh tren released.
const RECENT_LIMIT = 50;
export const getShopFinance = async (shopId, { from, to } = {}) => {
  const base = applyOrderListFilters({ shop_id: shopId, deleted_at: null }, { from, to });
  const pendingStatuses = [ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED];
  const sum = (status) =>
    prisma.order.aggregate({
      _sum: { total_amount: true },
      _count: { _all: true },
      where: { ...base, status },
    });
  const [released, pending, rate, recent] = await Promise.all([
    sum(ORDER_STATUS.DELIVERED),
    sum({ in: pendingStatuses }),
    getCommissionRate(),
    prisma.order.findMany({
      where: { ...base, status: { in: [ORDER_STATUS.DELIVERED, ...pendingStatuses] } },
      orderBy: { created_at: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, order_number: true, created_at: true, status: true, total_amount: true },
    }),
  ]);
  const releasedAmount = Number(released._sum.total_amount || 0);
  const { fee, net } = commissionOn(releasedAmount, rate);
  return {
    rate,
    released: { amount: releasedAmount, count: released._count._all },
    pending: { amount: Number(pending._sum.total_amount || 0), count: pending._count._all },
    fee,
    net,
    orders: recent.map((o) => {
      const gross = Number(o.total_amount || 0);
      return {
        id: o.id,
        order_number: o.order_number,
        created_at: o.created_at,
        status: o.status,
        gross,
        ...commissionOn(gross, rate),
      };
    }),
  };
};
