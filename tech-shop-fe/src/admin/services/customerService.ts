import axiosClient from '../../lib/axios'
import { AdminCustomer, CustomerListResponse, CustomerResponse, UpdateCustomerRequest } from '../types'

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
  delete(id: number) {
    return axiosClient.delete<{ message: string }>(`/customers/${id}`)
  }
}

export default adminCustomerService


