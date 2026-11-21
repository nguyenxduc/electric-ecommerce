import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminCustomerService, { type CustomerListQuery } from '../services/customerService'
import {
  CustomerListResponse,
  CustomerResponse,
  UpdateCustomerRequest,
  UpdateCustomerTierRequest,
  UpdateCustomerPointsRequest
} from '../types'

const customerKeys = {
  all: ['admin', 'customers'] as const,
  list: (params?: CustomerListQuery) => [...customerKeys.all, 'list', params] as const,
  detail: (id: number) => [...customerKeys.all, id] as const
}

export function useAdminCustomers(params?: CustomerListQuery) {
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

export function useUpdateAdminCustomerTier() {
  const qc = useQueryClient()
  return useMutation<
    { data: { message: string } },
    Error,
    { id: number; payload: UpdateCustomerTierRequest }
  >({
    mutationFn: ({ id, payload }) => adminCustomerService.updateTier(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all })
    }
  })
}

export function useUpdateAdminCustomerPoints() {
  const qc = useQueryClient()
  return useMutation<
    { data: { message: string } },
    Error,
    { id: number; payload: UpdateCustomerPointsRequest }
  >({
    mutationFn: ({ id, payload }) => adminCustomerService.updatePoints(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all })
    }
  })
}



export function useSuspendCustomer() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { id: number; reason: string }>({
    mutationFn: ({ id, reason }) => adminCustomerService.suspend(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all })
    }
  })
}

export function useUnsuspendCustomer() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: id => adminCustomerService.unsuspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all })
    }
  })
}
