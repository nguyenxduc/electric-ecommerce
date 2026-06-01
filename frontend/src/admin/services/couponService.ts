import axiosClient from '../../lib/axios'
import {
  AdminCoupon,
  CouponListResponse,
  CouponResponse,
  CreateCouponRequest,
  CreateCouponResponse,
  UpdateCouponRequest,
  UpdateCouponResponse,
  DeleteCouponResponse,
  ValidateCouponRequest,
  ValidateCouponResponse
} from '../types'

export const adminCouponService = {
  list(params?: { page?: number; limit?: number; q?: string }) {
    return axiosClient.get<CouponListResponse>('/coupons', { params })
  },
  getById(id: number) {
    return axiosClient.get<CouponResponse>(`/coupons/admin/${id}`)
  },
  create(payload: CreateCouponRequest) {
    return axiosClient.post<CreateCouponResponse>('/coupons', payload)
  },
  update(id: number, payload: UpdateCouponRequest) {
    return axiosClient.put<UpdateCouponResponse>(
      `/coupons/admin/${id}`,
      payload
    )
  },
  delete(id: number) {
    return axiosClient.delete<DeleteCouponResponse>(`/coupons/admin/${id}`)
  },
  validate(payload: ValidateCouponRequest) {
    return axiosClient.post<ValidateCouponResponse>(
      '/coupons/validate',
      payload
    )
  }
}

export default adminCouponService
