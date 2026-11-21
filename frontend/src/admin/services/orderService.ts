import axiosClient from '../../lib/axios'
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

export const adminOrderService = {
  list(params?: {
    page?: number
    limit?: number
    status?: string
    q?: string
    shop_id?: number
    from?: string
    to?: string
  }) {
    return axiosClient.get<OrderListResponse>('/orders', { params })
  },

  // Seller dashboard: own shop's orders only
  listMine(params?: {
    page?: number
    limit?: number
    status?: string
    q?: string
  }) {
    return axiosClient.get<OrderListResponse>('/orders/shop/mine', { params })
  },

  getById(id: number) {
    return axiosClient.get<OrderResponse>(`/orders/${id}`)
  },
  create(payload: CreateOrderRequest) {
    return axiosClient.post<CreateOrderResponse>('/orders', payload)
  },
  cancel(id: number) {
    return axiosClient.patch<CancelOrderResponse>(`/orders/${id}/cancel`, {})
  },
  updateStatus(id: number, payload: UpdateOrderStatusRequest) {
    return axiosClient.patch<UpdateOrderStatusResponse>(
      `/orders/${id}/update_status`,
      payload
    )
  },
  stats() {
    return axiosClient.get<OrderStatsResponse>('/orders/stats')
  },
  // Seller dashboard: own shop's stats
  shopStats() {
    return axiosClient.get<OrderStatsResponse>('/orders/shop/stats')
  },
  // Xac nhan hang loat (pending -> processing), backend bo qua don khong hop le
  bulkConfirmMine(orderIds: number[]) {
    return axiosClient.post<{
      updated: string[]
      skipped: { id: string; reason: string }[]
    }>('/orders/shop/bulk-status', { order_ids: orderIds, status: 'processing' })
  },
  // Xuat CSV theo bo loc hien tai; tra Blob de trinh duyet tai ve
  exportMineCsv(params?: { status?: string; q?: string; from?: string; to?: string }) {
    return axiosClient.get<Blob>('/orders/shop/export.csv', {
      params,
      responseType: 'blob'
    })
  }
}

export default adminOrderService
