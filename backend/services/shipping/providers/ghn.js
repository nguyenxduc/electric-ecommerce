// Adapter GHN theo tai lieu cong khai (https://api.ghn.vn). CHUA kiem chung voi
// sandbox that vi khong co credential: kiem tra lai truoc khi bat o production.
import { callCarrier, norm } from "./http.js";
import { AppError } from "../../../middleware/error.middleware.js";

const base = () => process.env.GHN_API_BASE || "https://dev-online-gateway.ghn.vn";
const headers = () => {
  if (!process.env.GHN_TOKEN || !process.env.GHN_SHOP_ID) {
    throw new AppError("GHN chua cau hinh GHN_TOKEN/GHN_SHOP_ID", 502);
  }
  return { Token: process.env.GHN_TOKEN, ShopId: process.env.GHN_SHOP_ID };
};
const call = (path, body, method = "POST", timeoutMs) =>
  callCarrier("GHN", `${base()}/shiip/public-api/${path}`, { method, headers: headers(), body, timeoutMs });

// Master data tinh/huyen/xa gan nhu khong doi: cache RAM 24h, bao gia (checkout) khong goi lai moi lan.
// shortcut: cache theo process, khong chia se giua worker, du dung vi du lieu nho.
const MASTER_TTL_MS = 24 * 60 * 60 * 1000;
const QUOTE_TIMEOUT_MS = 5000;
const masterCache = new Map();
const master = async (path, body, method) => {
  const key = `${path}:${JSON.stringify(body ?? "")}`;
  const hit = masterCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;
  const data = (await call(path, body, method, QUOTE_TIMEOUT_MS)).data || [];
  masterCache.set(key, { data, exp: Date.now() + MASTER_TTL_MS });
  return data;
};

const STATUS = {
  ready_to_pick: "created",
  picking: "picking",
  money_collect_picking: "picking",
  picked: "in_transit",
  storing: "in_transit",
  transporting: "in_transit",
  sorting: "in_transit",
  delivering: "in_transit",
  money_collect_delivering: "in_transit",
  delivered: "delivered",
  delivery_fail: "failed",
  waiting_to_return: "failed",
  return: "failed",
  return_transporting: "failed",
  returned: "returned",
  cancel: "cancelled",
};
export const ghnMapStatus = (s) => STATUS[String(s || "").toLowerCase()] || null;

// Phi GHN can id quan/phuong: tra cuu theo ten roi lay id
const findByName = (list, key, name) =>
  list.find((x) => norm(x[key]) === norm(name)) ||
  list.find((x) => (x.NameExtension || []).some((n) => norm(n) === norm(name)));

const resolveDest = async (to) => {
  const provinces = await master("master-data/province", undefined, "GET");
  const prov = findByName(provinces, "ProvinceName", to.province);
  if (!prov) throw new AppError("GHN: khong tim thay tinh/thanh", 502);
  const districts = await master("master-data/district", { province_id: prov.ProvinceID });
  const dist = findByName(districts, "DistrictName", to.district);
  if (!dist) throw new AppError("GHN: khong tim thay quan/huyen", 502);
  const wards = await master("master-data/ward", { district_id: dist.DistrictID });
  const ward = findByName(wards, "WardName", to.ward);
  return { district_id: dist.DistrictID, ward_code: ward?.WardCode };
};

export default {
  name: "ghn",
  async quote({ to, weightGrams, codVnd = 0, valueVnd = 0 }) {
    const d = await resolveDest(to);
    const r = await call(
      "v2/shipping-order/fee",
      {
        service_type_id: 2,
        to_district_id: d.district_id,
        to_ward_code: d.ward_code,
        weight: weightGrams,
        insurance_value: Math.min(valueVnd, 5_000_000),
        cod_value: codVnd,
      },
      "POST",
      QUOTE_TIMEOUT_MS
    );
    return { feeVnd: Number(r.data?.total) || 0 };
  },
  async createShipment({ order, shop, from, to, weightGrams, codVnd, items, receiver }) {
    const r = await call("v2/shipping-order/create", {
      payment_type_id: 1, // shop tra phi, nguoi nhan chi tra COD
      service_type_id: 2,
      required_note: "KHONGCHOXEMHANG",
      client_order_code: String(order.order_number || order.id),
      from_name: shop.name,
      from_phone: shop.contact_phone,
      from_address: from.address,
      from_ward_name: from.ward,
      from_district_name: from.district,
      from_province_name: from.province,
      to_name: receiver.name,
      to_phone: receiver.phone,
      to_address: to.address,
      to_ward_name: to.ward,
      to_district_name: to.district,
      to_province_name: to.province,
      weight: weightGrams,
      cod_amount: codVnd,
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, weight: i.weight })),
    });
    const d = r.data || {};
    if (!d.order_code) throw new AppError(`GHN: ${r.message || "tao van don that bai"}`, 502);
    return { trackingCode: d.order_code, feeVnd: Number(d.total_fee) || 0, labelUrl: null, raw: d };
  },
  async cancelShipment(s) {
    await call("v2/switch-status/cancel", { order_codes: [s.tracking_code] });
  },
  async getLabelUrl(s) {
    const r = await call("v2/a5/gen-token", { order_codes: [s.tracking_code] });
    return r.data?.token ? `${base()}/a5/public-api/printA5?token=${r.data.token}` : null;
  },
  async getStatus(s) {
    const r = await call("v2/shipping-order/detail", { order_code: s.tracking_code });
    return { status: ghnMapStatus(r.data?.status), description: r.data?.status, raw: r.data };
  },
  mapStatus: ghnMapStatus,
  parseWebhook: (b) => ({
    trackingCode: b?.OrderCode,
    status: ghnMapStatus(b?.Status),
    description: b?.Description || b?.Reason || b?.Status,
    raw: b,
  }),
};
