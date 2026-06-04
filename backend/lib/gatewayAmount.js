/** Shop prices are USD; MoMo/VNPay settle in VND. */
export const USD_TO_VND_RATE = Number(process.env.USD_TO_VND_RATE || 25000);
export const MOMO_MIN_AMOUNT_VND = Number(process.env.MOMO_MIN_AMOUNT_VND || 1000);

export const usdToGatewayVnd = (usdAmount) => {
  const usd = Number(usdAmount);
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.round(usd * USD_TO_VND_RATE);
};

export const momoMinOrderUsd = () =>
  Math.ceil((MOMO_MIN_AMOUNT_VND / USD_TO_VND_RATE) * 100) / 100;

export const resolveGatewayVndAmount = (usdAmount) => {
  const vnd = usdToGatewayVnd(usdAmount);
  if (vnd < MOMO_MIN_AMOUNT_VND) {
    const minUsd = momoMinOrderUsd();
    const err = new Error(
      `MoMo yêu cầu tối thiểu ${MOMO_MIN_AMOUNT_VND.toLocaleString("vi-VN")}₫ (khoảng $${minUsd} USD). Tổng đơn sau giảm giá quá thấp — vui lòng chọn COD hoặc thêm sản phẩm.`
    );
    err.status = 400;
    err.code = "MOMO_MIN_AMOUNT";
    err.minVnd = MOMO_MIN_AMOUNT_VND;
    err.minUsd = minUsd;
    err.amountVnd = vnd;
    throw err;
  }
  return vnd;
};
