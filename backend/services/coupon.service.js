// Kho voucher va luu voucher (kieu Shopee/Lazada): nguoi mua bam "Luu" de dua
// voucher cong khai vao kho cua minh.
//
// Hai loai voucher trong kho:
//   - "assigned": voucher ca nhan (quan he Coupon.users) - tang hang, doi diem.
//     Coupon.users khac rong nghia la CHI nhung nguoi do dung duoc, nen khong
//     ai luu duoc voucher nay.
//   - "claimed": voucher cong khai (Coupon.users rong) nguoi mua da luu
//     (bang coupon_claims).
//
// Quy tac hieu luc nam o pricing.service (couponStatus / resolveCouponDiscount);
// file nay chi doc/ghi DB va khong biet req/res.

import { prisma } from "../lib/db.js";
import { ORDER_STATUS, SHOP_STATUS } from "../constants/status.js";
import { couponStatus } from "./pricing.service.js";

const shopSelect = { id: true, name: true, slug: true };

// Voucher cong khai con nhan luu: dang bat, chua het han, khong gioi han nguoi dung.
const publicLiveWhere = (now) => ({
  deleted_at: null,
  is_active: true,
  users: { none: {} },
  OR: [{ expires_at: null }, { expires_at: { gt: now } }],
});

/**
 * So lan nguoi mua da dung moi voucher: dem checkout (order_group) con it nhat
 * mot don chua huy, nen checkout nhieu shop chi tinh mot lan va huy don tra luot.
 * `client` la prisma hoac tx (de dem trong cung giao dich khi dat don).
 *
 * @returns {Promise<Map<string, number>>} couponId -> so lan
 */
export const countUserCouponUses = async (client, userId, couponIds) => {
  const uses = new Map();
  if (!couponIds.length) return uses;
  const rows = await client.orderGroup.groupBy({
    by: ["coupon_id"],
    where: {
      user_id: BigInt(userId),
      coupon_id: { in: couponIds.map((id) => BigInt(id)) },
      orders: { some: { status: { not: ORDER_STATUS.CANCELLED } } },
    },
    _count: { _all: true },
  });
  for (const r of rows) uses.set(r.coupon_id.toString(), r._count._all);
  return uses;
};

const withStatus = (coupon, now, userUses = 0) => {
  const status = couponStatus(coupon, now, userUses);
  return {
    ...coupon,
    status,
    is_expired: status === "expired",
    is_exhausted: status === "used_up",
    is_usable: status === "active",
  };
};

/** Kho voucher cua nguoi mua: voucher ca nhan + voucher da luu, kem trang thai. */
export const listWarehouse = async (userId, now = new Date()) => {
  const uid = BigInt(userId);
  const coupons = await prisma.coupon.findMany({
    where: {
      deleted_at: null,
      OR: [{ users: { some: { id: uid } } }, { claims: { some: { user_id: uid } } }],
    },
    include: {
      shop: { select: shopSelect },
      claims: { where: { user_id: uid }, select: { claimed_at: true } },
    },
    orderBy: { created_at: "desc" },
  });
  const uses = await countUserCouponUses(
    prisma,
    userId,
    coupons.filter((c) => c.per_user_limit != null).map((c) => c.id)
  );
  return coupons.map(({ claims, ...c }) => ({
    ...withStatus(c, now, uses.get(c.id.toString()) ?? 0),
    source: claims.length ? "claimed" : "assigned",
    claimed_at: claims[0]?.claimed_at ?? null,
  }));
};

/**
 * Voucher cong khai nguoi mua luu duoc: cua san, cong voi cua cac shop trong
 * `shopIds` (shop phai dang hoat dong). Bo voucher da het luot.
 * `claimed` = nguoi goi da luu (khach chua dang nhap luon false).
 */
export const listClaimable = async ({ userId, shopIds = [], now = new Date() }) => {
  const ids = shopIds.map((id) => BigInt(id));
  const coupons = await prisma.coupon.findMany({
    where: {
      AND: [
        publicLiveWhere(now),
        {
          OR: [
            { shop_id: null },
            ...(ids.length
              ? [
                  {
                    shop_id: { in: ids },
                    shop: { status: SHOP_STATUS.ACTIVE, deleted_at: null },
                  },
                ]
              : []),
          ],
        },
      ],
    },
    include: {
      shop: { select: shopSelect },
      ...(userId && {
        claims: { where: { user_id: BigInt(userId) }, select: { id: true } },
      }),
    },
    orderBy: { created_at: "desc" },
  });
  return coupons
    .map(({ claims, ...c }) => ({ ...withStatus(c, now), claimed: !!claims?.length }))
    .filter((c) => c.status !== "used_up");
};

/** Voucher cong khai cua mot shop (trang shop/trang san pham), kem co `claimed`. */
export const listShopPublicCoupons = async ({ slug, userId, now = new Date() }) => {
  const coupons = await prisma.coupon.findMany({
    where: {
      ...publicLiveWhere(now),
      shop: { slug, status: SHOP_STATUS.ACTIVE, deleted_at: null },
    },
    include: userId
      ? { claims: { where: { user_id: BigInt(userId) }, select: { id: true } } }
      : undefined,
    orderBy: { created_at: "desc" },
    take: 10,
  });
  return coupons
    .map(({ claims, ...c }) => ({ ...withStatus(c, now), claimed: !!claims?.length }))
    .filter((c) => c.status !== "used_up");
};

/**
 * Luu voucher vao kho. Goi lai nhieu lan van chi co mot ban ghi (unique
 * user_id + coupon_id).
 *
 * @returns {{ok:true, claim:object} | {ok:false, code:string, message:string}}
 */
export const claimCoupon = async ({ userId, couponId, now = new Date() }) => {
  const coupon = await prisma.coupon.findFirst({
    where: {
      id: BigInt(couponId),
      deleted_at: null,
      // Voucher san hoac cua shop dang hoat dong; shop bi treo/xoa thi khong luu duoc
      OR: [{ shop_id: null }, { shop: { status: SHOP_STATUS.ACTIVE, deleted_at: null } }],
    },
    include: { users: { select: { id: true }, take: 1 } },
  });
  if (!coupon) {
    return { ok: false, code: "COUPON_NOT_FOUND", message: "Voucher not found" };
  }
  if (coupon.users.length) {
    return {
      ok: false,
      code: "COUPON_RESTRICTED",
      message: "This voucher is reserved for specific users",
    };
  }
  const status = couponStatus(coupon, now);
  // Voucher sap dien ra van luu truoc duoc, giong Shopee.
  if (status !== "active" && status !== "scheduled") {
    return { ok: false, code: "COUPON_UNAVAILABLE", message: "Voucher is no longer available" };
  }
  const uid = BigInt(userId);
  const claim = await prisma.couponClaim.upsert({
    where: { user_id_coupon_id: { user_id: uid, coupon_id: coupon.id } },
    create: { user_id: uid, coupon_id: coupon.id },
    update: {},
  });
  return { ok: true, claim };
};

/** Bo voucher da luu khoi kho (khong anh huong voucher ca nhan). */
export const unclaimCoupon = ({ userId, couponId }) =>
  prisma.couponClaim.deleteMany({
    where: { user_id: BigInt(userId), coupon_id: BigInt(couponId) },
  });

/** Tim voucher trong kho theo ma (voucher ca nhan hoac da luu). */
export const findWarehouseCouponByCode = (userId, code) => {
  const uid = BigInt(userId);
  return prisma.coupon.findFirst({
    where: {
      code,
      deleted_at: null,
      OR: [{ users: { some: { id: uid } } }, { claims: { some: { user_id: uid } } }],
    },
    include: { shop: { select: shopSelect }, users: { select: { id: true } } },
  });
};

/** Voucher co the dung cho gio hang: kho + voucher cong khai cua san va cac shop trong gio. */
export const listCheckoutCandidates = async ({ userId, shopIds, now = new Date() }) => {
  const [warehouse, claimable] = await Promise.all([
    listWarehouse(userId, now),
    listClaimable({ userId, shopIds, now }),
  ]);
  const seen = new Set(warehouse.map((c) => c.id.toString()));
  return [
    ...warehouse.map((c) => ({ ...c, claimed: true })),
    ...claimable.filter((c) => !seen.has(c.id.toString())),
  ];
};
