import { SuccessResponse } from './common'

export type DiscountType = 'percent' | 'fixed'

export type AdminCoupon = {
  id: number
  code: string
  description?: string
  discount_type: DiscountType | string
  discount_value: number
  min_order?: number
  usage_limit?: number
  used_count?: number
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

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
  min_order?: number
  usage_limit?: number
  expires_at?: string | null
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

export type UpdateCouponRequest = Partial<{
  code: string
  description: string
  discount_type: DiscountType
  discount_value: number
  min_order: number
  usage_limit: number
  expires_at: string | null
}>

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
