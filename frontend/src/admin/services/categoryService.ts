import axiosClient from '../../lib/axios'
import {
  AdminCategory,
  CategoryListResponse,
  CategoryResponse,
  CreateCategoryRequest,
  DeleteCategoryResponse,
  UpdateCategoryRequest
} from '../types'

// Truong ten/mo ta doc tu payload (dang long {category} hoac phang)
type CategoryFields = { name?: string; description?: string }

export const adminCategoryService = {
  list(params?: { page?: number; limit?: number; q?: string }) {
    return axiosClient.get<CategoryListResponse>('/categories/admin', {
      params
    })
  },
  getById(id: number) {
    return axiosClient.get<CategoryResponse>(`/categories/${id}`)
  },
  create(payload: CreateCategoryRequest & { image?: File }) {
    const form = new FormData()
    const data = payload.category || (payload as CategoryFields)
    if (data?.name) form.append('name', String(data.name))
    if (data?.description) form.append('description', String(data.description))
    if ((payload as { image_url?: string }).image_url)
      form.append('image_url', String((payload as { image_url?: string }).image_url))
    if (payload.image) form.append('image', payload.image)
    return axiosClient.post<AdminCategory>('/categories', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  update(id: number, payload: UpdateCategoryRequest & { image?: File }) {
    const form = new FormData()
    const data = payload.category || (payload as CategoryFields)
    if (data?.name !== undefined) form.append('name', String(data.name))
    if (data?.description !== undefined)
      form.append('description', String(data.description))
    if ((payload as { image_url?: string }).image_url !== undefined)
      form.append('image_url', String((payload as { image_url?: string }).image_url))
    if (payload.image) form.append('image', payload.image)
    return axiosClient.patch<AdminCategory>(`/categories/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  delete(id: number) {
    return axiosClient.delete<DeleteCategoryResponse>(`/categories/${id}`)
  }
}

export default adminCategoryService
