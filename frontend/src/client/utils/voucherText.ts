import { formatPrice } from './formatMoney'
// Chu hien thi chung cho the voucher (trang shop, kho voucher, checkout)
type VoucherLike = {
  discount_type: string
  discount_value: number | string
  min_order?: number | string | null
  max_discount?: number | string | null
  starts_at?: string | null
  expires_at?: string | null
}

const money = (v: number | string) => formatPrice(v)
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB')

export const voucherTitle = (v: VoucherLike) =>
  v.discount_type === 'percent'
    ? `${Number(v.discount_value)}% OFF`
    : `${money(v.discount_value)} OFF`

// "Min order ₫1.250.000 · Max ₫250.000"
export const voucherTerms = (v: VoucherLike) =>
  [
    Number(v.min_order) ? `Min order ${money(v.min_order!)}` : 'No minimum',
    v.discount_type === 'percent' && v.max_discount != null
      ? `Max ${money(v.max_discount)}`
      : null
  ]
    .filter(Boolean)
    .join(' · ')

// "01/12/2026 - 31/12/2026" / "Until 31/12/2026" / "No expiry"
export const voucherValidity = (v: VoucherLike) => {
  if (v.starts_at && v.expires_at) return `${day(v.starts_at)} - ${day(v.expires_at)}`
  if (v.starts_at) return `From ${day(v.starts_at)}`
  if (v.expires_at) return `Until ${day(v.expires_at)}`
  return 'No expiry'
}

export const VOUCHER_STATUS_LABEL = {
  active: 'Usable',
  scheduled: 'Not started',
  paused: 'Paused',
  expired: 'Expired',
  used_up: 'Used up',
  used_by_you: 'Used'
} as const
