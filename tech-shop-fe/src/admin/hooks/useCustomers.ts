import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminCustomerService from '../services/customerService'
import { CustomerListResponse, CustomerResponse, UpdateCustomerRequest } from '../types'

const customerKeys = {
  all: ['admin', 'customers'] as const,
  list: (params?: { page?: number; limit?: number; q?: string }) => [...customerKeys.all, 'list', params] as const,
  detail: (id: number) => [...customerKeys.all, id] as const
}

export function useAdminCustomers(params?: { page?: number; limit?: number; q?: string }) {
  return useQuery<{ data: CustomerListResponse }, Error>({
    queryKey: customerKeys.list(params),
    queryFn: () => adminCustomerService.list(params)
  })
}

export function useAdminCustomer(id: number) {
  return useQuery<{ data: CustomerResponse }, Error>({
    queryKey: customerKeys.detail(id),
    queryFn: () => adminCustomerService.getById(id),
    enabled: !!id
  })
}

export function useUpdateAdminCustomer(id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: { message: string } }, Error, UpdateCustomerRequest>({
    mutationFn: payload => adminCustomerService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) })
      qc.invalidateQueries({ queryKey: customerKeys.all })
    }
  })
}

export function useDeleteAdminCustomer() {
  const qc = useQueryClient()
  return useMutation<{ data: { message: string } }, Error, number>({
    mutationFn: id => adminCustomerService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all })
    }
  })
}


