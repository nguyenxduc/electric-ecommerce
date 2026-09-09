// Quy tac tinh tien cho mot lan thanh toan da gian hang.
//
// Toan bo file nay la ham thuan: khong doc DB, khong biet req/res, khong mo
// giao dich. Nguoi goi nap du lieu vao, nhan ket qua ra.
//
// Vi sao tach: truoc day toan bo phan nay nam trong createOrder, mot ham dai
// 483 dong lam ca sau viec cung luc - doc san pham, kiem tra ton kho, tinh
// tien, ghi don, cong diem, ghi log. Bat bien dong tien la thu quan trong nhat
// cua ca he thong nhung lai khong kiem thu duoc rieng, phai dung ca mot don
// hang that qua HTTP moi cham toi duoc no.
//
// Tach ra roi thi bat bien kiem tra truc tiep duoc bang hang tram bo so ngau
// nhien trong vai mili giay, xem tests/15-pricing.test.mjs.

/** Lam tron ve 2 chu so thap phan. Moi phep lam tron trong file deu di qua day. */
export const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Uu dai tu dong theo hang thanh vien, ap vao toan bo gio hang. */
export const TIER_AUTO_DISCOUNT_RATE = {
  BRONZE: 0,
  SILVER: 0.02,
  GOLD: 0.05,
  PLATINUM: 0.08,
};

export const getTierFromPoints = (points = 0) => {
  const p = Number(points) || 0;
  if (p >= 5000) return "PLATINUM";
  if (p >= 2000) return "GOLD";
  if (p >= 500) return "SILVER";
  return "BRONZE";
};

/**
 * Gom cac mon hang theo gian hang. Moi gian hang se thanh mot don con rieng.
 *
 * @param {Array<{shop:object, data:{total_price:number}}>} preparedItems
 * @returns {Map<string, object>} khoa la shopId dang chuoi
 */
export const groupItemsByShop = (preparedItems) => {
  const shopGroups = new Map();
  for (const item of preparedItems) {
    const key = item.shop.id.toString();
    if (!shopGroups.has(key)) {
      shopGroups.set(key, {
        shopId: item.shop.id,
        shopName: item.shop.name,
        shopOwnerId: item.shop.owner_id,
        shippingFeeOverride: item.shop.shipping_fee_override,
        freeShippingThresholdOverride:
          item.shop.free_shipping_threshold_override,
        items: [],
        subtotal: 0,
      });
    }
    const group = shopGroups.get(key);
    group.items.push(item);
    group.subtotal += Number(item.data.total_price);
  }
  return shopGroups;
};

/**
 * Phi van chuyen tinh rieng cho tung gian hang: dung muc cua shop neu shop tu
 * dat, khong thi lay muc mac dinh cua san. Nguong mien phi cung vay.
 *
 * Ham nay GHI vao group.shipping va tra ve tong phi.
 */
export const applyShopShipping = (
  shopGroups,
  { platformShippingFee, platformFreeThreshold }
) => {
  let shippingTotal = 0;
  for (const group of shopGroups.values()) {
    const fee =
      group.shippingFeeOverride != null
        ? Number(group.shippingFeeOverride)
        : platformShippingFee;
    const threshold =
      group.freeShippingThresholdOverride != null
        ? Number(group.freeShippingThresholdOverride)
        : platformFreeThreshold;
    group.shipping = group.subtotal >= threshold ? 0 : round2(fee);
    shippingTotal += group.shipping;
  }
  return shippingTotal;
};

/** Uu dai theo hang, ap truoc voucher. */
export const computeTierDiscount = (totalAmount, tierDiscountRate) => {
  const base = round2(totalAmount);
  const tierDiscount = round2(base * tierDiscountRate);
  return {
    totalAmount: base,
    tierDiscount,
    amountAfterTierDiscount: round2(Math.max(0, base - tierDiscount)),
  };
};

/**
 * Tinh muc giam cua voucher.
 *
 * Tra ve ket qua co cau truc thay vi nem loi hay tra res.status(400): tang HTTP
 * la noi duy nhat biet ma trang thai la gi. Nho vay quy tac voucher kiem thu
 * duoc ma khong can dung request.
 *
 * @returns {{ok:true, couponDiscount:number, couponShopKey:string|null}
 *          | {ok:false, code:string, message:string}}
 */
export const resolveCouponDiscount = ({
  coupon,
  shopGroups,
  tierDiscountRate,
  amountAfterTierDiscount,
  userId,
  now = new Date(),
}) => {
  if (!coupon) {
    return { ok: false, code: "COUPON_NOT_FOUND", message: "Invalid coupon code" };
  }
  if (coupon.expires_at && now > coupon.expires_at) {
    return { ok: false, code: "COUPON_EXPIRED", message: "Coupon has expired" };
  }
  if (
    coupon.usage_limit !== null &&
    coupon.used_count !== null &&
    coupon.used_count >= coupon.usage_limit
  ) {
    return {
      ok: false,
      code: "COUPON_LIMIT_REACHED",
      message: "Coupon usage limit reached",
    };
  }
  // Voucher ca nhan: phai thuoc dung nguoi dang dat.
  if (
    Array.isArray(coupon.users) &&
    coupon.users.length > 0 &&
    !coupon.users.some((u) => u.id.toString() === String(userId))
  ) {
    return {
      ok: false,
      code: "COUPON_NOT_OWNED",
      message: "Voucher does not belong to this user",
    };
  }

  if (coupon.shop_id) {
    // Voucher cua shop: chi giam tren phan hang cua chinh shop do.
    const couponShopKey = coupon.shop_id.toString();
    const targetGroup = shopGroups.get(couponShopKey);
    if (!targetGroup) {
      return {
        ok: false,
        code: "COUPON_SHOP_MISSING",
        message: `Voucher only applies to items from ${
          coupon.shop?.name || "its shop"
        }`,
      };
    }
    const groupAfterTier = round2(targetGroup.subtotal * (1 - tierDiscountRate));
    if (coupon.min_order && groupAfterTier < Number(coupon.min_order)) {
      return {
        ok: false,
        code: "COUPON_MIN_ORDER",
        message: `${coupon.shop?.name || "Shop"} items do not meet the voucher minimum`,
      };
    }
    const raw =
      coupon.discount_type === "percent"
        ? (groupAfterTier * Number(coupon.discount_value)) / 100
        : Number(coupon.discount_value);
    return {
      ok: true,
      couponShopKey,
      couponDiscount: round2(Math.min(raw, groupAfterTier)),
    };
  }

  // Voucher cua san: giam tren toan gio hang.
  if (
    coupon.min_order &&
    Number(amountAfterTierDiscount) < Number(coupon.min_order)
  ) {
    return {
      ok: false,
      code: "COUPON_MIN_ORDER",
      message: "Order does not meet minimum amount",
    };
  }
  const raw =
    coupon.discount_type === "percent"
      ? (Number(amountAfterTierDiscount) * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);
  return {
    ok: true,
    couponShopKey: null,
    couponDiscount: round2(Math.min(raw, amountAfterTierDiscount)),
  };
};

/**
 * Phan bo tien hang cho tung don con.
 *
 * Day la cho phai giu BAT BIEN: tong tien cac don con cong lai phai bang dung
 * so tien nguoi mua tra, khong duoc lech mot xu. Neu lech thi doi soat voi cong
 * thanh toan sai, va tien thuc nhan cua nguoi ban cung sai.
 *
 * Quy tac:
 *   - uu dai theo hang chia theo ti le gia tri hang cua tung shop
 *   - voucher cua shop roi tron ven vao chinh shop do
 *   - voucher cua san chia theo ti le
 *   - **don cuoi cung hap thu toan bo sai so lam tron**
 *
 * Diem cuoi la mau chot: lam tron tung don roi cong lai gan nhu chac chan lech
 * vai xu so voi tong. Thay vi lam tron rieng le roi hy vong khop, don cuoi lay
 * phan con lai dung bang hieu so, nen tong luon khop tuyet doi.
 *
 * Ham GHI vao group.merchTotal va group.finalTotal.
 */
export const allocateMerchandise = (
  shopGroups,
  { merchandiseTotal, totalAmount, tierDiscount, couponDiscount, couponShopKey }
) => {
  const groups = [...shopGroups.values()];
  let allocatedMerch = 0;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (i === groups.length - 1) {
      group.merchTotal = round2(merchandiseTotal - allocatedMerch);
    } else {
      const share = totalAmount > 0 ? group.subtotal / totalAmount : 0;
      const tierShare = tierDiscount * share;
      const couponShare = couponShopKey
        ? group.shopId.toString() === couponShopKey
          ? couponDiscount
          : 0
        : couponDiscount * share;
      group.merchTotal = round2(
        Math.max(0, group.subtotal - tierShare - couponShare)
      );
      allocatedMerch += group.merchTotal;
    }
    group.finalTotal = round2(group.merchTotal + group.shipping);
  }

  return groups;
};

/**
 * Tien hang sau moi khoan giam, chua cong phi ship.
 * Phi ship cong o tren cung chu khong bi giam gia.
 */
export const merchandiseTotalAfterDiscounts = (
  amountAfterTierDiscount,
  couponDiscount
) => Math.max(0, Number(amountAfterTierDiscount) - couponDiscount);
