import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminProductService from '../services/productService'
import {
  AddRatingRequest,
  AddRatingResponse,
  AddSalesRequest,
  AddSalesResponse,
  AdminProduct,
  CreateProductRequest,
  ProductListQuery,
  ProductListResponse,
  ProductResponse,
  UpdateProductRequest
} from '../types'

const productKeys = {
  all: ['admin', 'products'] as const,
  list: (params?: ProductListQuery) =>
    [...productKeys.all, 'list', params] as const,
  detail: (id: number) => [...productKeys.all, id] as const
}

export function useAdminProducts(params?: ProductListQuery) {
  return useQuery<{ data: ProductListResponse }, Error>({
    queryKey: productKeys.list(params),
    queryFn: () => adminProductService.list(params)
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
  return useMutation<{ data: AdminProduct }, Error, CreateProductRequest>({
    mutationFn: payload => adminProductService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all })
    }
  })
}

export function useUpdateAdminProduct(id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: AdminProduct }, Error, UpdateProductRequest>({
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
