import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminCategoryService from '../services/categoryService'
import {
  AdminCategory,
  AdminSubCategory,
  CategoryListResponse,
  CategoryResponse,
  CreateCategoryRequest,
  CreateSubCategoryRequest,
  SubCategoryListResponse,
  SubCategoryResponse,
  UpdateCategoryRequest,
  UpdateSubCategoryRequest
} from '../types'

const categoryKeys = {
  all: ['admin', 'categories'] as const,
  list: (params?: { page?: number; limit?: number; q?: string }) =>
    [...categoryKeys.all, 'list', params] as const,
  detail: (id: number) => [...categoryKeys.all, id] as const
}

export function useAdminCategories(params?: {
  page?: number
  limit?: number
  q?: string
}) {
  return useQuery<{ data: CategoryListResponse }, Error>({
    queryKey: categoryKeys.list(params),
    queryFn: () => adminCategoryService.list(params)
  })
}

export function useAdminCategory(id: number) {
  return useQuery<{ data: CategoryResponse }, Error>({
    queryKey: categoryKeys.detail(id),
    queryFn: () => adminCategoryService.getById(id),
    enabled: !!id
  })
}

export function useCreateAdminCategory() {
  const qc = useQueryClient()
  return useMutation<{ data: AdminCategory }, Error, CreateCategoryRequest>({
    mutationFn: payload => adminCategoryService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
    }
  })
}

export function useUpdateAdminCategory(id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: AdminCategory }, Error, UpdateCategoryRequest>({
    mutationFn: payload => adminCategoryService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.detail(id) })
      qc.invalidateQueries({ queryKey: categoryKeys.all })
    }
  })
}

export function useDeleteAdminCategory() {
  const qc = useQueryClient()
  return useMutation<{ data: unknown }, Error, number>({
    mutationFn: id => adminCategoryService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all })
    }
  })
}
