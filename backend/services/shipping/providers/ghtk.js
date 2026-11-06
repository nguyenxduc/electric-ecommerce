// Adapter GHTK theo tai lieu cong khai (docs.giaohangtietkiem.vn). CHUA kiem chung
// voi sandbox that vi khong co credential: kiem tra lai truoc khi bat o production.
import { callCarrier } from "./http.js";
import { AppError } from "../../../middleware/error.middleware.js";

const base = () => process.env.GHTK_API_BASE || "https://services-staging.ghtklab.com";
const headers = () => {
  if (!process.env.GHTK_TOKEN) throw new AppError("GHTK chua cau hinh GHTK_TOKEN", 502);
  return { Token: process.env.GHTK_TOKEN };
};
const call = (path, body, method = "POST", timeoutMs) =>
  callCarrier("GHTK", `${base()}${path}`, { method, headers: headers(), body, timeoutMs });

// status_id cua GHTK theo bang chinh thuc (api.ghtk.vn/en/docs/submit-order/webhook).
// Ma shipper tu bao (123, 127, 128, 45, 49, 410) GHTK ghi ro "khong phai trang
// thai chinh thuc": khong map, neu khong 45 se danh dau da giao + da thu COD
// truoc khi GHTK xac nhan.
const STATUS = {
  "-1": "cancelled",
  1: "created", // chua tiep nhan
  2: "created", // da tiep nhan
  12: "picking", // dang lay hang
  7: "picking", // lay hang that bai (se lay lai)
  8: "picking", // hoan lay hang
  3: "in_transit", // da lay hang / nhap kho
  4: "in_transit", // dang giao
  10: "in_transit", // hoan giao hang
  26: "in_transit",
  30: "in_transit",
  31: "in_transit",
  91: "in_transit", // cac moc trung chuyen
  5: "delivered", // da giao, chua doi soat
  6: "delivered", // da doi soat
  9: "failed", // giao that bai
  20: "failed", // dang hoan hang: hang chua ve shop
  // shortcut: 13 (don den bu, mat hang) de "failed" cho xu ly tay vi hang khong
  // ve kho - map "returned" se cong lai ton kho sai; can luong boi thuong rieng.
  13: "failed",
  21: "returned", // da hoan hang
  11: "returned", // da doi soat hoan hang
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
    const feeVnd = Number(r.fee?.fee);
    // Thieu/<=0 la loi bao gia: nem de checkout dung phi co dinh thay vi free ship
    if (!(feeVnd > 0)) throw new AppError(`GHTK: ${r.message || "bao phi that bai"}`, 502);
    return { feeVnd };
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
  async getStatus(s, { timeoutMs } = {}) {
    const r = await call(`/services/shipment/v2/${s.tracking_code}`, undefined, "GET", timeoutMs);
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
