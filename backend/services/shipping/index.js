// Van chuyen: bao gia theo phi co dinh hoac theo don vi van chuyen.
// Tao van don + webhook nam o shipment.service.js.
import { prisma } from "../../lib/db.js";
import { USD_TO_VND_RATE } from "../../lib/gatewayAmount.js";
import { applyShopShipping, round2 } from "../pricing.service.js";
import { getProvider } from "./providers/index.js";

export const getSettingString = async (key, defaultValue) => {
  try {
    const s = await prisma.setting.findFirst({ where: { key, deleted_at: null } });
    return s?.value?.trim() || defaultValue;
  } catch (error) {
    console.error(`getSettingString(${key}) error:`, error);
    return defaultValue;
  }
};

export const getActiveProvider = async () =>
  getProvider(await getSettingString("shipping_provider", "mock")) || getProvider("mock");

export const vndToUsd = (vnd) => round2(vnd / USD_TO_VND_RATE);
export const usdToVnd = (usd) => Math.round(Number(usd) * USD_TO_VND_RATE);

// shipping_address co the la chuoi (checkout kieu cu) -> khong du du lieu, de caller roi ve phi co dinh
export const toParts = (a) =>
  a && typeof a === "object"
    ? { province: a.province, district: a.district, ward: a.ward, address: a.address }
    : {};

/**
 * Tinh phi ship cho tung nhom shop, GHI vao group.shipping, tra ve tong (USD).
 * Moi group co them group.weightGrams (tong khoi luong).
 * @param {Map} shopGroups ket qua groupItemsByShop
 * @param {object} opts { address, platformShippingFee, platformFreeThreshold }
 */
export const quoteShippingForGroups = async (shopGroups, opts) => {
  // Luon tinh phi co dinh truoc: la gia tri du phong khi bao gia that bai
  const flatTotal = applyShopShipping(shopGroups, opts);
  if ((await getSettingString("shipping_rate_mode", "flat")) !== "carrier") return flatTotal;

  const to = toParts(opts.address);
  const provider = await getActiveProvider();
  const shops = await prisma.shop.findMany({
    where: { id: { in: [...shopGroups.values()].map((g) => g.shopId) } },
    select: { id: true, pickup_province: true, pickup_district: true, pickup_ward: true, pickup_address: true },
  });
  const pickup = new Map(shops.map((s) => [s.id.toString(), s]));

  let total = 0;
  for (const group of shopGroups.values()) {
    const threshold =
      group.freeShippingThresholdOverride != null
        ? Number(group.freeShippingThresholdOverride)
        : opts.platformFreeThreshold;
    const s = pickup.get(group.shopId.toString());
    const from = s && {
      province: s.pickup_province,
      district: s.pickup_district,
      ward: s.pickup_ward,
      address: s.pickup_address,
    };
    if (group.subtotal >= threshold) {
      group.shipping = 0;
    } else if (from?.province && to.province) {
      try {
        const { feeVnd } = await provider.quote({
          from,
          to,
          weightGrams: Math.max(group.weightGrams || 0, 1),
          valueVnd: usdToVnd(group.subtotal),
        });
        group.shipping = vndToUsd(feeVnd);
      } catch (err) {
        console.error(`[shipping] quote ${provider.name} failed, dung phi co dinh:`, err.message);
      }
    }
    total += group.shipping;
  }
  return total;
};
