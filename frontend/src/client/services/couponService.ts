import axiosClient from '../../lib/axios'

export type VoucherShop = { id: number | string; name: string; slug: string }

// Trang thai hieu luc do backend tinh (pricing.service couponStatus)
export type VoucherStatus = 'active' | 'scheduled' | 'paused' | 'expired' | 'used_up' | 'used_by_you'

export type ValidateCouponResponse = {
  valid: boolean
  coupon: {
    code: string
    discount_type: string
    discount_value: number
    min_order?: number | null
    max_discount?: number | string | null
    usage_limit?: number | null
    used_count?: number | null
    expires_at?: string | null
    // set for shop vouchers - the discount only applies to that shop's items
    shop_id?: number | string | null
    shop?: VoucherShop | null
  }
  // Backend da tinh dung pham vi shop + tran giam
  discount: number
  finalAmount: number
}

export type MyVoucher = {
  id: string | number
  code: string
  description?: string | null
  discount_type: string
  discount_value: number | string
  min_order?: number | string | null
  max_discount?: number | string | null
  usage_limit?: number | null
  used_count?: number | null
  starts_at?: string | null
  expires_at?: string | null
  created_at: string
  shop_id?: number | string | null
  shop?: VoucherShop | null
  status: VoucherStatus
  source?: 'claimed' | 'assigned'
  claimed?: boolean
  is_expired?: boolean
  is_exhausted?: boolean
  is_usable?: boolean
}

export type QuotedVoucher = MyVoucher & {
  claimed: boolean
  applicable: boolean
  discount: number
  reason: string | null
}

// shopAmounts: { shopId: tien hang shop do sau uu dai hang }
export type VoucherCart = { amount: number; shopAmounts: Record<string, number> }

export const validateCoupon = async (
  code: string,
  cart: VoucherCart
): Promise<ValidateCouponResponse> => {
  const { data } = await axiosClient.post('/coupons/validate', {
    code,
    amount: cart.amount,
    shop_amounts: cart.shopAmounts
  })
  return data
}

export const validateMyCoupon = async (
  code: string,
  cart: VoucherCart
): Promise<ValidateCouponResponse> => {
  const { data } = await axiosClient.post('/coupons/validate-my', {
    code,
    amount: cart.amount,
    shop_amounts: cart.shopAmounts
  })
  return data
}

export const getMyCoupons = async (): Promise<{ coupons: MyVoucher[] }> => {
  const { data } = await axiosClient.get<{
    success: boolean
    data: { coupons: MyVoucher[] }
  }>('/coupons/my')
  return data.data
}

// Kho + voucher luu duoc cho gio hang, moi cai kem applicable/discount/reason
export const quoteCoupons = async (cart: VoucherCart): Promise<QuotedVoucher[]> => {
  const { data } = await axiosClient.post<{
    data: { coupons: QuotedVoucher[] }
  }>('/coupons/quote', { amount: cart.amount, shop_amounts: cart.shopAmounts })
  return data.data.coupons
}

export const claimCoupon = async (id: number | string): Promise<void> => {
  await axiosClient.post(`/coupons/${id}/claim`)
}
