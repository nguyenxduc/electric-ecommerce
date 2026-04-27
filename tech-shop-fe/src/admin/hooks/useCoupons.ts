import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminCouponService from '../services/couponService'
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

const couponKeys = {
  all: ['admin', 'coupons'] as const,
  list: (params?: { page?: number; limit?: number; q?: string }) =>
    [...couponKeys.all, 'list', params] as const,
  detail: (id: number) => [...couponKeys.all, id] as const,
  validate: (payload: ValidateCouponRequest) =>
    [...couponKeys.all, 'validate', payload.code, payload.amount] as const
}

export function useAdminCoupons(params?: {
  page?: number
  limit?: number
  q?: string
}) {
  return useQuery<{ data: CouponListResponse }, Error>({
    queryKey: couponKeys.list(params),
    queryFn: () => adminCouponService.list(params)
  })
}

export function useAdminCoupon(id: number) {
  return useQuery<{ data: CouponResponse }, Error>({
    queryKey: couponKeys.detail(id),
    queryFn: () => adminCouponService.getById(id),
    enabled: !!id
  })
}

export function useCreateAdminCoupon() {
  const qc = useQueryClient()
  return useMutation<
    { data: CreateCouponResponse },
    Error,
    CreateCouponRequest
  >({
    mutationFn: payload => adminCouponService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: couponKeys.all })
    }
  })
}

export function useUpdateAdminCoupon(id: number) {
  const qc = useQueryClient()
  return useMutation<
    { data: UpdateCouponResponse },
    Error,
    UpdateCouponRequest
  >({
    mutationFn: payload => adminCouponService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: couponKeys.detail(id) })
      qc.invalidateQueries({ queryKey: couponKeys.all })
    }
  })
}

export function useDeleteAdminCoupon() {
  const qc = useQueryClient()
  return useMutation<{ data: DeleteCouponResponse }, Error, number>({
    mutationFn: id => adminCouponService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: couponKeys.all })
    }
  })
}

export function useValidateCoupon(
  payload: ValidateCouponRequest,
  enabled = true
) {
  return useQuery<{ data: ValidateCouponResponse }, Error>({
    queryKey: couponKeys.validate(payload),
    queryFn: () => adminCouponService.validate(payload),
    enabled
  })
}
