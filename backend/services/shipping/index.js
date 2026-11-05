// Van chuyen: bao gia, tao van don, webhook trang thai, COD.
// STUB: hien thuc o buoc A (xem .omc/autopilot/spec.md).
import { applyShopShipping } from "../pricing.service.js";

/**
 * Tinh phi ship cho tung nhom shop, GHI vao group.shipping, tra ve tong (USD).
 * Moi group co them group.weightGrams (tong khoi luong).
 * @param {Map} shopGroups ket qua groupItemsByShop
 * @param {object} opts { address, platformShippingFee, platformFreeThreshold }
 */
export const quoteShippingForGroups = async (shopGroups, opts) =>
  applyShopShipping(shopGroups, opts);
