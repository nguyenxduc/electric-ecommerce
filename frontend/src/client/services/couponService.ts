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

export type MyVoucher = {
  id: string | number
  code: string
  description?: string | null
  discount_type: string
  discount_value: number
  min_order?: number | null
  usage_limit?: number | null
  used_count?: number | null
  expires_at?: string | null
  created_at: string
  is_expired?: boolean
  is_exhausted?: boolean
  is_usable?: boolean
}

export const validateCoupon = async (
  code: string,
  amount: number
): Promise<{ valid: boolean; discount: number; finalAmount: number }> => {
  const { data } = await axiosClient.post('/coupons/validate', { code, amount })
  return data
}

export const validateMyCoupon = async (
  code: string,
  amount: number
): Promise<{ valid: boolean; discount: number; finalAmount: number }> => {
  const { data } = await axiosClient.post('/coupons/validate-my', { code, amount })
  return data
}

export const getMyCoupons = async (): Promise<{ coupons: MyVoucher[] }> => {
  const { data } = await axiosClient.get<{
    success: boolean
    data: { coupons: MyVoucher[] }
  }>('/coupons/my')
  return data.data
}
