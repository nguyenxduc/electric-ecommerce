// Danh gia rui ro gian lan luc checkout.
// STUB: hien thuc o buoc C (xem .omc/autopilot/spec.md).

/**
 * @param {object} ctx { userId, paymentMethod, receiverPhone, address,
 *   coupon, clientIp, deviceId, finalAmount, shopOwnerIds }
 * @returns {Promise<{block:boolean, couponBlocked:boolean, score:number,
 *   reasons:string[], message?:string}>}
 */
export const assessCheckoutRisk = async (_ctx) => ({
  block: false,
  couponBlocked: false,
  score: 0,
  reasons: [],
});

/** Ghi FraudFlag sau khi don da tao (ngoai giao dich, loi khong lam hong don). */
export const recordCheckoutRisk = async (_orderGroup, _assessment, _ctx) => {};
