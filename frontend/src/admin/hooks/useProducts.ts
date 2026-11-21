import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminProductService, { type AdminProductListQuery } from '../services/productService'
import {
  AddRatingRequest,
  AddRatingResponse,
  AddSalesRequest,
  AddSalesResponse,
  AdminProduct,
  ProductListQuery,
  ProductListResponse,
  ProductFormPayload,
  ProductResponse
} from '../types'

const productKeys = {
  all: ['admin', 'products'] as const,
  list: (params?: AdminProductListQuery) =>
    [...productKeys.all, 'list', params] as const,
  detail: (id: number) => [...productKeys.all, id] as const
}

export function useAdminProducts(params?: AdminProductListQuery) {
  return useQuery<{ data: ProductListResponse }, Error>({
    queryKey: productKeys.list(params),
    queryFn: () => adminProductService.list(params)
  })
}

// Seller dashboard: own shop's products. Shares productKeys.all so
// create/update/delete invalidation refreshes this list too.
export function useMyShopProducts(
  params?: ProductListQuery & { stock?: 'low'; status?: 'live' | 'hidden' }
) {
  return useQuery<{ data: ProductListResponse }, Error>({
    queryKey: [...productKeys.all, 'mine', params],
    queryFn: () => adminProductService.listMine(params)
  })
}

export function useAdminProduct(id: number) {
  return useQuery<{ data: ProductResponse }, Error>({
    queryKey: productKeys.detail(id),
    queryFn: () => adminProductService.getById(id),
    enabled: !!id
  })
}

export function useCreateAdminProduct() {
  const qc = useQueryClient()
  return useMutation<{ data: AdminProduct }, Error, ProductFormPayload>({
    mutationFn: payload => adminProductService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all })
    }
  })
}

export function useUpdateAdminProduct(id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: AdminProduct }, Error, ProductFormPayload>({
    mutationFn: payload => adminProductService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(id) })
      qc.invalidateQueries({ queryKey: productKeys.all })
    }
  })
}

export function useDeleteAdminProduct() {
  const qc = useQueryClient()
  return useMutation<{ data: unknown }, Error, number>({
    mutationFn: id => adminProductService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all })
    }
  })
}

export function useSetProductVisibility() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { id: number; is_active: boolean }>({
    mutationFn: ({ id, is_active }) => adminProductService.setVisibility(id, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all })
    }
  })
}

export function useAddProductSales(id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: AddSalesResponse }, Error, AddSalesRequest>({
    mutationFn: payload => adminProductService.addSales(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(id) })
    }
  })
}

export function useAddProductRating(id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: AddRatingResponse }, Error, AddRatingRequest>({
    mutationFn: payload => adminProductService.addRating(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(id) })
    }
  })
}

export function useTakedownProduct() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { id: number; reason: string }>({
    mutationFn: ({ id, reason }) => adminProductService.takedown(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard', 'todo'] })
    }
  })
}

export function useRestoreProduct() {
  const qc = useQueryClient()
  return useMutation<unknown, Error, number>({
    mutationFn: id => adminProductService.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard', 'todo'] })
    }
  })
}
