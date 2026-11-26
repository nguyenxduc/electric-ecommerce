// Khoa sandbox cong khai cua MoMo (co trong tai lieu MoMo). Chi dung ngoai production:
// o production ai cung ky duoc IPN gia bang khoa nay va danh dau don da thanh toan.
const MOMO_SANDBOX = {
  partnerCode: "MOMO",
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
};

// Tra ve khoa MoMo dang dung, hoac null khi production thieu khoa (fail closed).
export const momoCredentials = (env = process.env) => {
  if (env.MOMO_ACCESS_KEY && env.MOMO_SECRET_KEY) {
    return {
      partnerCode: env.MOMO_PARTNER_CODE || MOMO_SANDBOX.partnerCode,
      accessKey: env.MOMO_ACCESS_KEY,
      secretKey: env.MOMO_SECRET_KEY,
    };
  }
  return env.NODE_ENV === "production" ? null : MOMO_SANDBOX;
};
