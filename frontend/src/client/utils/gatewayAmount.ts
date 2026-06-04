export const USD_TO_VND_RATE = Number(import.meta.env.VITE_USD_TO_VND_RATE || 25000)
export const MOMO_MIN_AMOUNT_VND = 1000

export const usdToGatewayVnd = (usd: number) =>
  Math.round(Number(usd) * USD_TO_VND_RATE)

export const momoMinOrderUsd = () =>
  Math.ceil((MOMO_MIN_AMOUNT_VND / USD_TO_VND_RATE) * 100) / 100

export const canPayWithMomo = (usd: number) =>
  usdToGatewayVnd(usd) >= MOMO_MIN_AMOUNT_VND
