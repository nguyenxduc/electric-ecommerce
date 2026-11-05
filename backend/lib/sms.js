// Gui SMS OTP. Provider chon qua env SMS_PROVIDER (mac dinh 'console').
// Provider that (esms, speedsms, twilio...) CHUA hien thuc: can hop dong + API key
// + dang ky brandname truoc; them vao PROVIDERS voi chu ky async (phone, text).

// Chuan hoa SDT VN ve dang 0xxxxxxxxx; tra null neu khong hop le.
export const normalizeVnPhone = (raw) => {
  let p = String(raw ?? "").replace(/[\s.\-()]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length === 11) p = "0" + p.slice(2);
  return /^0\d{9}$/.test(p) ? p : null;
};

const PROVIDERS = {
  console: async (phone, text) => {
    console.log(`[sms:console] ${phone}: ${text}`);
  },
};

export const smsProvider = () => (process.env.SMS_PROVIDER || "console").toLowerCase();

// Dev-only: cho phep tra ma OTP trong response de test/demo khong can SMS that.
export const exposeDevCode = () =>
  process.env.NODE_ENV !== "production" && smsProvider() === "console";

export const sendSms = async (phone, text) => {
  const send = PROVIDERS[smsProvider()];
  if (!send) throw new Error(`SMS provider "${smsProvider()}" chua duoc ho tro`);
  await send(phone, text);
};
