// Don vi van chuyen gia lap (mac dinh): xac dinh, khong goi mang, dung cho dev/test.
import { norm } from "./http.js";

const BASE_SAME = 15000;
const BASE_OTHER = 30000;
const STEP_VND = 5000; // moi 500g tiep theo

export const mockFeeVnd = ({ from, to, weightGrams }) => {
  const same = from?.province && to?.province && norm(from.province) === norm(to.province);
  const steps = Math.max(0, Math.ceil(Math.max(weightGrams, 1) / 500) - 1);
  return (same ? BASE_SAME : BASE_OTHER) + steps * STEP_VND;
};

// Mock nhan thang trang thai noi bo; "picked" la ten goi khac cua in_transit
export const mockMapStatus = (s) => (s === "picked" ? "in_transit" : s);

export default {
  name: "mock",
  async quote(p) {
    return { feeVnd: mockFeeVnd(p) };
  },
  async createShipment({ order, from, to, weightGrams }) {
    return {
      trackingCode: `MOCK${order.id}`,
      feeVnd: mockFeeVnd({ from, to, weightGrams }),
      labelUrl: null,
      raw: { mock: true },
    };
  },
  async cancelShipment() {},
  async getLabelUrl() {
    return null;
  },
  mapStatus: mockMapStatus,
  parseWebhook: (body) => ({
    trackingCode: body?.tracking_code,
    status: mockMapStatus(body?.status),
    description: body?.description,
    raw: body,
  }),
};
