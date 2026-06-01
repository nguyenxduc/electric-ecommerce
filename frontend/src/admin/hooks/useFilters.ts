import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminFilterService from '../services/filterService'
import {
  FilterMetadataResponse,
  FilterOptionListResponseWithSuccess,
  FilterOptionResponse,
  CreateFilterOptionRequest,
  UpdateFilterOptionRequest
} from '../types'

const filterKeys = {
  all: ['admin', 'filters'] as const,
  byCategory: (category_id?: number) =>
    [...filterKeys.all, category_id] as const,
  admin: {
    all: ['admin', 'filterOptions'] as const,
    list: (params?: {
      category_id?: number
      key?: string
      is_active?: boolean
      page?: number
      limit?: number
      q?: string
    }) => [...filterKeys.admin.all, 'list', params] as const,
    detail: (id: number) => [...filterKeys.admin.all, id] as const
  }
}

// Public filter metadata
export function useAdminFilters(category_id?: number) {
  return useQuery<{ success: boolean; data: FilterMetadataResponse }, Error>({
    queryKey: filterKeys.byCategory(category_id),
    queryFn: () => adminFilterService.get(category_id)
  })
}

// Admin CRUD hooks
export function useAdminFilterOptions(params?: {
  category_id?: number
  key?: string
  is_active?: boolean
  page?: number
  limit?: number
  q?: string
}) {
  return useQuery<{ data: FilterOptionListResponseWithSuccess }, Error>({
    queryKey: filterKeys.admin.list(params),
    queryFn: () => adminFilterService.list(params)
  })
}

export function useAdminFilterOption(id: number) {
  return useQuery<FilterOptionResponse, Error>({
    queryKey: filterKeys.admin.detail(id),
    queryFn: () => adminFilterService.getById(id),
    enabled: !!id
  })
}

export function useCreateAdminFilterOption() {
  const qc = useQueryClient()
  return useMutation<FilterOptionResponse, Error, CreateFilterOptionRequest>({
    mutationFn: payload => adminFilterService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filterKeys.admin.all })
      qc.invalidateQueries({ queryKey: filterKeys.all })
    }
  })
}

export function useUpdateAdminFilterOption(id: number) {
  const qc = useQueryClient()
  return useMutation<FilterOptionResponse, Error, UpdateFilterOptionRequest>({
    mutationFn: payload => adminFilterService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filterKeys.admin.detail(id) })
      qc.invalidateQueries({ queryKey: filterKeys.admin.all })
      qc.invalidateQueries({ queryKey: filterKeys.all })
    }
  })
}

export function useDeleteAdminFilterOption() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean; message: string }, Error, number>({
    mutationFn: id => adminFilterService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filterKeys.admin.all })
      qc.invalidateQueries({ queryKey: filterKeys.all })
    }
  })
}

export function useSyncFilterOptions() {
  const qc = useQueryClient()
  return useMutation<
    { success: boolean; message: string; data: any },
    Error,
    number | undefined
  >({
    mutationFn: category_id => adminFilterService.sync(category_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filterKeys.admin.all })
      qc.invalidateQueries({ queryKey: filterKeys.all })
    }
  })
}
