import axiosClient from '../../lib/axios'
import {
  AdminCustomer,
  CustomerListResponse,
  CustomerResponse,
  UpdateCustomerRequest,
  UpdateCustomerTierRequest,
  UpdateCustomerPointsRequest
} from '../types'

export type CustomerListQuery = { page?: number; limit?: number; q?: string; role?: string }

export const adminCustomerService = {
  list(params?: CustomerListQuery) {
    return axiosClient.get<CustomerListResponse>('/customers', { params })
  },
  getById(id: number) {
    return axiosClient.get<CustomerResponse>(`/customers/${id}`)
  },
  update(id: number, payload: UpdateCustomerRequest) {
    return axiosClient.patch<{ message: string; user: AdminCustomer }>(`/customers/${id}`, payload)
  },
  updateTier(id: number, payload: UpdateCustomerTierRequest) {
    return axiosClient.patch<{ message: string; user: AdminCustomer }>(
      `/customers/${id}/tier`,
      payload
    )
  },
  updatePoints(id: number, payload: UpdateCustomerPointsRequest) {
    return axiosClient.patch<{ message: string; user: AdminCustomer }>(
      `/customers/${id}/points`,
      payload
    )
  },
  // Khoa tai khoan: chan dang nhap va moi token dang dung
  suspend(id: number, reason: string) {
    return axiosClient.patch<{ message: string }>(`/customers/${id}/suspend`, { reason })
  },
  unsuspend(id: number) {
    return axiosClient.patch<{ message: string }>(`/customers/${id}/unsuspend`)
  },
  delete(id: number) {
    return axiosClient.delete<{ message: string }>(`/customers/${id}`)
  }
}

export default adminCustomerService


