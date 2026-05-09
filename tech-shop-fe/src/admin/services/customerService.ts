import axiosClient from '../../lib/axios'
import {
  AdminCustomer,
  CustomerListResponse,
  CustomerResponse,
  UpdateCustomerRequest,
  UpdateCustomerTierRequest,
  UpdateCustomerPointsRequest
} from '../types'

export const adminCustomerService = {
  list(params?: { page?: number; limit?: number; q?: string }) {
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
  delete(id: number) {
    return axiosClient.delete<{ message: string }>(`/customers/${id}`)
  }
}

export default adminCustomerService


