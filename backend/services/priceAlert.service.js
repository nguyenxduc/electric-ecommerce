import { prisma } from "../lib/db.js";
import { SHOP_STATUS } from "../constants/status.js";
import { effectiveDiscount } from "../lib/productQuery.js";
import { createSlug } from "../lib/slug.js";
import { formatVnd } from "../lib/gatewayAmount.js";

// Cung cua so chong spam voi thong bao PROMO cua shop (shopFollow.service)
const DEDUPE_MS = 24 * 3600 * 1000;

const finalPrice = (p, now) => Number(p.price) - effectiveDiscount(p, now);

// Gia ban thuc te (sau giam gia thuong/flash dang chay) giam -> bao nguoi da them vao wishlist.
// before/after: ban ghi product truoc va sau khi cap nhat. Fire-and-forget, khong nem loi ra ngoai.
export const notifyWishlistPriceDrop = (before, after) =>
  (async () => {
    const now = new Date();
    const oldPrice = finalPrice(before, now);
    const newPrice = finalPrice(after, now);
    if (!(newPrice < oldPrice - 0.005)) return;
    if (after.deleted_at || after.taken_down_at || after.is_active === false) return;

    const shop = await prisma.shop.findUnique({
      where: { id: BigInt(after.shop_id) },
      select: { owner_id: true, status: true, deleted_at: true },
    });
    if (!shop || shop.deleted_at || shop.status !== SHOP_STATUS.ACTIVE) return;

    const link = `/product/${createSlug(after.name) || "product"}-p${after.id}`;
    const since = new Date(now.getTime() - DEDUPE_MS);
    const recent = await prisma.notification.findMany({
      where: { type: "PROMO", link, created_at: { gte: since } },
      select: { user_id: true },
    });
    const skip = new Set(recent.map((n) => String(n.user_id)));
    const fans = (
      await prisma.wishlist.findMany({
        where: { product_id: BigInt(after.id), deleted_at: null, user_id: { not: shop.owner_id } },
        select: { user_id: true },
      })
    ).filter((w) => !skip.has(String(w.user_id)));
    if (fans.length === 0) return;

    const pct = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    await prisma.notification.createMany({
      data: fans.map((w) => ({
        user_id: w.user_id,
        title: "Price drop on your wishlist",
        message: `${after.name} is now ${formatVnd(newPrice)} (was ${formatVnd(oldPrice)}${pct > 0 ? `, -${pct}%` : ""})`,
        type: "PROMO",
        link,
      })),
    });
  })().catch((err) => console.error("notifyWishlistPriceDrop error:", err));
