import { USD_TO_VND_RATE } from './gatewayAmount'

/** DB, checkout va loyalty luu gia USD; giao dien hien thi VND nhu cac san VN. */
export const STORE_CURRENCY = 'USD'

/** Doi so tien USD (dang luu) sang VND de hien thi, vd 199 -> "₫4.975.000". */
export const formatPrice = (value: number | string | null | undefined) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `₫${Math.round(n * USD_TO_VND_RATE).toLocaleString('vi-VN')}`
}
