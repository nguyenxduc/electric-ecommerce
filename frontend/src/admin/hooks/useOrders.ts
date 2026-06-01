import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminOrderService from '../services/orderService'
import {
  AdminOrder,
  CancelOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderListResponse,
  OrderResponse,
  OrderStatsResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse
} from '../types'

const orderKeys = {
  all: ['admin', 'orders'] as const,
  list: (params?: { page?: number; limit?: number; status?: string; q?: string }) =>
    [...orderKeys.all, 'list', params] as const,
  detail: (id: number) => [...orderKeys.all, id] as const,
  stats: ['admin', 'orders', 'stats'] as const
}

export function useAdminOrders(params?: { page?: number; limit?: number; status?: string; q?: string }) {
  return useQuery<{ data: OrderListResponse }, Error>({
    queryKey: orderKeys.list(params),
    queryFn: () => adminOrderService.list(params)
  })
}

export function useAdminOrder(id: number) {
  return useQuery<{ data: OrderResponse }, Error>({
    queryKey: orderKeys.detail(id),
    queryFn: () => adminOrderService.getById(id),
    enabled: !!id
  })
}

export function useCreateAdminOrder() {
  const qc = useQueryClient()
  return useMutation<{ data: CreateOrderResponse }, Error, CreateOrderRequest>({
    mutationFn: payload => adminOrderService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all })
    }
  })
}

export function useCancelAdminOrder(id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: CancelOrderResponse }, Error, void>({
    mutationFn: () => adminOrderService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.detail(id) })
      qc.invalidateQueries({ queryKey: orderKeys.all })
    }
  })
}

export function useUpdateAdminOrderStatus(id: number) {
  const qc = useQueryClient()
  return useMutation<
    { data: UpdateOrderStatusResponse },
    Error,
    UpdateOrderStatusRequest
  >({
    mutationFn: payload => adminOrderService.updateStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.detail(id) })
      qc.invalidateQueries({ queryKey: orderKeys.all })
    }
  })
}

export function useAdminOrderStats() {
  return useQuery<{ data: OrderStatsResponse }, Error>({
    queryKey: orderKeys.stats,
    queryFn: () => adminOrderService.stats()
  })
}
