import axiosClient from '../../lib/axios'
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

export const adminProductService = {
  list(params?: ProductListQuery) {
    return axiosClient.get<ProductListResponse>('/products', { params })
  },
  getById(id: number) {
    return axiosClient.get<ProductResponse>(`/products/${id}`)
  },
  create(payload: CreateProductRequest & { images?: File[] }) {
    const form = new FormData()
    const data = (payload as any).product || payload
    if (data?.name) form.append('name', String(data.name))
    if (data?.price !== undefined) form.append('price', String(data.price))
    if (data?.discount !== undefined)
      form.append('discount', String(data.discount))
    if (data?.quantity !== undefined)
      form.append('quantity', String(data.quantity))
    if (data?.product_colors)
      form.append('product_colors', JSON.stringify(data.product_colors))
    if (data?.category_id !== undefined)
      form.append('category_id', String(data.category_id))
    if (data?.sub_category_id !== undefined)
      form.append('sub_category_id', String(data.sub_category_id))
    if (data?.specs) form.append('specs', JSON.stringify(data.specs))
    if (data?.specs_detail)
      form.append('specs_detail', JSON.stringify(data.specs_detail))
    if (data?.color) form.append('color', JSON.stringify(data.color))
    if (Array.isArray(payload.images))
      payload.images.forEach(f => form.append('images', f))
    if (Array.isArray(data?.img)) form.append('img', JSON.stringify(data.img))
    return axiosClient.post<AdminProduct>('/products', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  update(id: number, payload: UpdateProductRequest & { images?: File[] }) {
    const form = new FormData()
    const data = (payload as any).product || payload
    if (data?.name !== undefined) form.append('name', String(data.name))
    if (data?.price !== undefined) form.append('price', String(data.price))
    if (data?.discount !== undefined)
      form.append('discount', String(data.discount))
    if (data?.quantity !== undefined)
      form.append('quantity', String(data.quantity))
    if (data?.product_colors !== undefined)
      form.append('product_colors', JSON.stringify(data.product_colors))
    if (data?.category_id !== undefined)
      form.append('category_id', String(data.category_id))
    if (data?.sub_category_id !== undefined)
      form.append('sub_category_id', String(data.sub_category_id))
    if (data?.specs !== undefined)
      form.append('specs', JSON.stringify(data.specs))
    if (data?.specs_detail !== undefined)
      form.append('specs_detail', JSON.stringify(data.specs_detail))
    if (data?.color !== undefined)
      form.append('color', JSON.stringify(data.color))
    if (Array.isArray(payload.images))
      payload.images.forEach(f => form.append('images', f))
    if (Array.isArray(data?.img)) form.append('img', JSON.stringify(data.img))
    return axiosClient.patch<AdminProduct>(`/products/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  delete(id: number) {
    return axiosClient.delete(`/products/${id}`)
  },
  addSales(id: number, payload: AddSalesRequest) {
    return axiosClient.patch<AddSalesResponse>(
      `/products/${id}/add_sales`,
      payload
    )
  },
  addRating(id: number, payload: AddRatingRequest) {
    return axiosClient.patch<AddRatingResponse>(
      `/products/${id}/add_rating`,
      payload
    )
  },
  uploadImage(id: number, file: File) {
    const form = new FormData()
    form.append('image', file)
    return axiosClient.post<AdminProduct>(`/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export default adminProductService
