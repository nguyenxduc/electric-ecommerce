import { prisma } from "../lib/db.js";
import { SHOP_STATUS } from "../constants/status.js";

// Loi nghiep vu co status de controller map ra HTTP (service khong biet res)
export class ShopFollowError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const findActiveShop = async (slug) => {
  const shop = await prisma.shop.findFirst({
    where: { slug, deleted_at: null, status: SHOP_STATUS.ACTIVE },
    select: { id: true, owner_id: true },
  });
  if (!shop) throw new ShopFollowError(404, "Shop not found");
  return shop;
};

export const countFollowers = (shopId) =>
  prisma.shopFollow.count({ where: { shop_id: shopId } });

export const isFollowing = async (userId, shopId) =>
  Boolean(
    await prisma.shopFollow.findUnique({
      where: { user_id_shop_id: { user_id: userId, shop_id: shopId } },
      select: { id: true },
    })
  );

// Idempotent: theo doi lan 2 khong loi, khong tao ban ghi trung
export const followShop = async (userId, slug) => {
  const shop = await findActiveShop(slug);
  if (shop.owner_id === userId) {
    throw new ShopFollowError(400, "You cannot follow your own shop");
  }
  try {
    await prisma.shopFollow.upsert({
      where: { user_id_shop_id: { user_id: userId, shop_id: shop.id } },
      create: { user_id: userId, shop_id: shop.id },
      update: {},
    });
  } catch (err) {
    // bam 2 lan cung luc: upsert thu hai dung unique key, ban ghi da co nen van la thanh cong
    if (err?.code !== "P2002") throw err;
  }
  return { is_following: true, follower_count: await countFollowers(shop.id) };
};

export const unfollowShop = async (userId, slug) => {
  // Bo theo doi duoc ca shop dang bi khoa, nen khong loc theo trang thai
  const shop = await prisma.shop.findFirst({ where: { slug, deleted_at: null }, select: { id: true } });
  if (!shop) throw new ShopFollowError(404, "Shop not found");
  await prisma.shopFollow.deleteMany({
    where: { user_id: userId, shop_id: shop.id },
  });
  return { is_following: false, follower_count: await countFollowers(shop.id) };
};

// Bao cho nguoi theo doi shop (1 thong bao/nguoi, type PROMO). Fire-and-forget:
// loi chi ghi log, khong bao gio lam hong request cua seller; khong bao chu shop.
const PROMO_DEDUPE_MS = 24 * 3600 * 1000;

export const notifyFollowers = (shopId, { title, message, link = null }) =>
  (async () => {
    const shop = await prisma.shop.findUnique({
      where: { id: BigInt(shopId) },
      select: { owner_id: true, status: true, deleted_at: true },
    });
    // shop bi khoa/xoa: nguoi mua khong vao duoc, khong bao
    if (!shop || shop.deleted_at || shop.status !== SHOP_STATUS.ACTIVE) return;
    // Chong spam: moi nguoi nhan toi da 1 thong bao PROMO cung link trong 24h
    // (seller luu lai san pham, tao nhieu voucher lien tiep...)
    const since = new Date(Date.now() - PROMO_DEDUPE_MS);
    const recent = link
      ? await prisma.notification.findMany({
          where: { type: "PROMO", link, created_at: { gte: since } },
          select: { user_id: true },
        })
      : [];
    const skip = new Set(recent.map((n) => String(n.user_id)));
    const followers = (
      await prisma.shopFollow.findMany({
        where: { shop_id: BigInt(shopId), user_id: { not: shop.owner_id } },
        select: { user_id: true },
      })
    ).filter((f) => !skip.has(String(f.user_id)));
    if (followers.length === 0) return;
    await prisma.notification.createMany({
      data: followers.map((f) => ({ user_id: f.user_id, title, message, type: "PROMO", link })),
    });
  })().catch((err) => console.error("notifyFollowers error:", err));

export const listFollowedShops =async (userId, { skip, take }) => {
  const where = {
    user_id: userId,
    shop: { deleted_at: null, status: SHOP_STATUS.ACTIVE },
  };
  const [rows, total] = await Promise.all([
    prisma.shopFollow.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      select: {
        created_at: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            _count: {
              select: {
                products: { where: { deleted_at: null } },
                followers: true,
              },
            },
          },
        },
      },
    }),
    prisma.shopFollow.count({ where }),
  ]);
  const shops = rows.map(({ shop, created_at }) => ({
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    logo_url: shop.logo_url,
    product_count: shop._count.products,
    follower_count: shop._count.followers,
    followed_at: created_at,
  }));
  return { shops, total };
};
