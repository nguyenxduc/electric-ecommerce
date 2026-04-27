import axiosClient from '../../lib/axios'

export type ValidateCouponResponse = {
  valid: boolean
  coupon: {
    code: string
    discount_type: string
    discount_value: number
    min_order?: number | null
    usage_limit?: number | null
    used_count?: number | null
    expires_at?: string | null
  }
  discount: number
  finalAmount: number
}

export const validateCoupon = async (
  code: string,
  amount: number
): Promise<{ valid: boolean; discount: number; finalAmount: number }> => {
  const { data } = await axiosClient.post('/coupons/validate', { code, amount })
  return data
}
