import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminOrderService from '../services/orderService'
import {
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
  list: (params?: AdminOrderListParams) =>
    [...orderKeys.all, 'list', params] as const,
  detail: (id: number) => [...orderKeys.all, id] as const,
  stats: ['admin', 'orders', 'stats'] as const
}

export type AdminOrderListParams = {
  page?: number
  limit?: number
  status?: string
  q?: string
  shop_id?: number
  from?: string
  to?: string
}

export function useAdminOrders(params?: AdminOrderListParams) {
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
      // Doi trang thai co the sinh/huy van don va hoa don
      qc.invalidateQueries({ queryKey: ['shipment', id] })
      qc.invalidateQueries({ queryKey: ['order-invoice', id] })
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

// Seller dashboard: own shop's orders. Shares orderKeys.all so status
// updates invalidate these lists too.
export function useMyShopOrders(params?: {
  page?: number
  limit?: number
  status?: string
  q?: string
}) {
  return useQuery<{ data: OrderListResponse }, Error>({
    queryKey: [...orderKeys.all, 'mine', params],
    queryFn: () => adminOrderService.listMine(params)
  })
}

export function useMyShopOrderStats() {
  return useQuery<{ data: OrderStatsResponse }, Error>({
    queryKey: [...orderKeys.all, 'mine', 'stats'],
    queryFn: () => adminOrderService.shopStats()
  })
}

// Doi trang thai ngay tren danh sach (vd. "Confirm" don pending), id truyen luc goi
export function useUpdateShopOrderStatus() {
  const qc = useQueryClient()
  return useMutation<{ data: UpdateOrderStatusResponse }, Error, { id: number } & UpdateOrderStatusRequest>({
    mutationFn: ({ id, ...payload }) => adminOrderService.updateStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all })
      qc.invalidateQueries({ queryKey: ['seller', 'dashboard'] })
    }
  })
}

export function useBulkConfirmShopOrders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderIds: number[]) => adminOrderService.bulkConfirmMine(orderIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all })
      qc.invalidateQueries({ queryKey: ['seller', 'dashboard'] })
    }
  })
}
