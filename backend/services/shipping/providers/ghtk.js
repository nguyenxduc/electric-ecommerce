// Adapter GHTK theo tai lieu cong khai (docs.giaohangtietkiem.vn). CHUA kiem chung
// voi sandbox that vi khong co credential: kiem tra lai truoc khi bat o production.
import { callCarrier } from "./http.js";
import { AppError } from "../../../middleware/error.middleware.js";

const base = () => process.env.GHTK_API_BASE || "https://services-staging.ghtklab.com";
const headers = () => {
  if (!process.env.GHTK_TOKEN) throw new AppError("GHTK chua cau hinh GHTK_TOKEN", 502);
  return { Token: process.env.GHTK_TOKEN };
};
const call = (path, body, method = "POST") =>
  callCarrier("GHTK", `${base()}${path}`, { method, headers: headers(), body });

// status_id cua GHTK
const STATUS = {
  "-1": "cancelled",
  1: "created",
  2: "created",
  12: "picking",
  7: "picking",
  8: "picking",
  127: "picking",
  128: "picking",
  3: "in_transit",
  123: "in_transit",
  4: "in_transit",
  10: "in_transit",
  410: "in_transit",
  5: "delivered",
  6: "delivered",
  45: "delivered",
  9: "failed",
  13: "failed",
  49: "failed",
  20: "failed",
  21: "returned",
};
export const ghtkMapStatus = (s) => STATUS[String(s)] || null;

export default {
  name: "ghtk",
  async quote({ from, to, weightGrams, valueVnd = 0 }) {
    const q = new URLSearchParams({
      pick_province: from.province,
      pick_district: from.district || "",
      province: to.province,
      district: to.district || "",
      address: to.address || "",
      weight: String(weightGrams),
      value: String(valueVnd),
      transport: "road",
    });
    const r = await call(`/services/shipment/fee?${q}`, undefined, "GET");
    if (!r.success) throw new AppError(`GHTK: ${r.message || "bao phi that bai"}`, 502);
    return { feeVnd: Number(r.fee?.fee) || 0 };
  },
  async createShipment({ order, shop, from, to, weightGrams, codVnd, items, receiver }) {
    const r = await call("/services/shipment/order/?ver=1.5", {
      products: items.map((i) => ({ name: i.name, weight: i.weight / 1000, quantity: i.quantity })),
      order: {
        id: String(order.order_number || order.id),
        pick_name: shop.name,
        pick_address: from.address,
        pick_province: from.province,
        pick_district: from.district,
        pick_ward: from.ward,
        pick_tel: shop.contact_phone,
        name: receiver.name,
        address: to.address,
        province: to.province,
        district: to.district,
        ward: to.ward,
        tel: receiver.phone,
        pick_money: codVnd,
        value: codVnd,
        is_freeship: 1,
        transport: "road",
        total_weight: weightGrams / 1000,
      },
    });
    if (!r.success) throw new AppError(`GHTK: ${r.message || "tao van don that bai"}`, 502);
    const o = r.order || {};
    return { trackingCode: o.label, feeVnd: Number(o.fee) || 0, labelUrl: null, raw: o };
  },
  async cancelShipment(s) {
    const r = await call(`/services/shipment/cancel/${s.tracking_code}`);
    if (!r.success) throw new AppError(`GHTK: ${r.message || "huy van don that bai"}`, 502);
  },
  // Nhan PDF cua GHTK can header Token nen khong co link public; dung nhan HTML cua he thong
  async getLabelUrl() {
    return null;
  },
  async getStatus(s) {
    const r = await call(`/services/shipment/v2/${s.tracking_code}`, undefined, "GET");
    return { status: ghtkMapStatus(r.order?.status), description: r.order?.status_text, raw: r.order };
  },
  mapStatus: ghtkMapStatus,
  parseWebhook: (b) => ({
    trackingCode: b?.label_id,
    status: ghtkMapStatus(b?.status_id),
    description: b?.reason || b?.status_id,
    raw: b,
  }),
};
