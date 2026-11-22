import { SuccessResponse } from './common'

export type DiscountType = 'percent' | 'fixed'

export type AdminCoupon = {
  id: number
  code: string
  description?: string
  discount_type: DiscountType | string
  discount_value: number
  min_order?: number
  max_discount?: number | string | null
  usage_limit?: number
  per_user_limit?: number | null
  used_count?: number
  starts_at?: string | null
  expires_at?: string | null
  is_active?: boolean
  // null = voucher cua san
  shop_id?: number | null
  shop?: { id: number; name: string; slug: string } | null
  status?: 'active' | 'scheduled' | 'paused' | 'expired' | 'used_up'
  created_at?: string
  updated_at?: string
}

export type CouponScope = 'platform' | 'shop' 

export type CouponListResponse = {
  coupons: AdminCoupon[]
  pagination: {
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

export type CouponResponse = AdminCoupon

export type CreateCouponRequest = {
  code: string
  description?: string
  discount_type?: DiscountType
  discount_value: number
  min_order?: number | null
  max_discount?: number | null
  usage_limit?: number | null
  per_user_limit?: number | null
  starts_at?: string | null
  expires_at?: string | null
  is_active?: boolean
}

export type CreateCouponResponse =
  | SuccessResponse<{
      message: string
      coupon: AdminCoupon
    }>
  | {
      message: string
      coupon: AdminCoupon
    }

export type UpdateCouponRequest = Partial<Omit<CreateCouponRequest, 'code'>> & {
  code?: string
}

export type UpdateCouponResponse =
  | SuccessResponse<{
      message: string
      coupon: AdminCoupon
    }>
  | {
      message: string
      coupon: AdminCoupon
    }

export type DeleteCouponResponse =
  | SuccessResponse<{
      message: string
    }>
  | {
      message: string
    }

export type ValidateCouponRequest = {
  code: string
  amount: number
}

export type ValidateCouponResponse = {
  valid: boolean
  coupon?: AdminCoupon
  discount?: number
  finalAmount?: number
  message?: string
}
