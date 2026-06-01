import axiosClient from '../../lib/axios'
import {
  FilterMetadataResponse,
  FilterOptionListResponseWithSuccess,
  FilterOptionResponse,
  CreateFilterOptionRequest,
  UpdateFilterOptionRequest
} from '../types'

export const adminFilterService = {
  // Public endpoint
  get(category_id?: number) {
    return axiosClient.get<{ success: boolean; data: FilterMetadataResponse }>(
      '/filter',
      {
        params: { category_id }
      }
    )
  },
  // Admin CRUD
  list(params?: {
    category_id?: number
    key?: string
    is_active?: boolean
    page?: number
    limit?: number
    q?: string
  }) {
    return axiosClient.get<FilterOptionListResponseWithSuccess>(
      '/filter/admin',
      {
        params
      }
    )
  },
  getById(id: number) {
    return axiosClient.get<FilterOptionResponse>(`/filter/admin/${id}`)
  },
  create(payload: CreateFilterOptionRequest) {
    return axiosClient.post<FilterOptionResponse>('/filter/admin', payload)
  },
  update(id: number, payload: UpdateFilterOptionRequest) {
    return axiosClient.put<FilterOptionResponse>(`/filter/admin/${id}`, payload)
  },
  delete(id: number) {
    return axiosClient.delete<{ success: boolean; message: string }>(
      `/filter/admin/${id}`
    )
  },
  sync(category_id?: number) {
    return axiosClient.post<{ success: boolean; message: string; data: any }>(
      '/filter/sync',
      null,
      {
        params: category_id ? { category_id } : undefined
      }
    )
  }
}

export default adminFilterService
