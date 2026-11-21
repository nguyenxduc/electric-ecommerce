import axiosClient from '../../lib/axios'
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

export type AdminProductListQuery = ProductListQuery & {
  shop_id?: number
  status?: 'live' | 'hidden' | 'taken_down'
}

export const adminProductService = {
  list(params?: AdminProductListQuery) {
    return axiosClient.get<ProductListResponse>('/products', { params })
  },
  // Seller dashboard: own shop's products (any shop status)
  listMine(params?: ProductListQuery & { stock?: 'low'; status?: 'live' | 'hidden' }) {
    return axiosClient.get<ProductListResponse>('/products/shop/mine', {
      params
    })
  },
  getById(id: number) {
    return axiosClient.get<ProductResponse>(`/products/${id}`)
  },
  create(payload: ProductFormPayload) {
    const form = new FormData()
    const data = ((payload as { product?: Record<string, unknown> }).product ||
      payload) as Record<string, unknown>
    if (data?.shop_id !== undefined && data?.shop_id !== null && data?.shop_id !== '')
      form.append('shop_id', String(data.shop_id))
    if (data?.name) form.append('name', String(data.name))
    if (data?.description !== undefined)
      form.append('description', String(data.description))
    if (data?.price !== undefined) form.append('price', String(data.price))
    if (data?.discount !== undefined)
      form.append('discount', String(data.discount))
    if (data?.quantity !== undefined)
      form.append('quantity', String(data.quantity))
    if (data?.weight_grams !== undefined)
      form.append('weight_grams', String(data.weight_grams))
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
    if (data?.variants)
      form.append('variants', JSON.stringify(data.variants))
    if (Array.isArray(payload.images))
      payload.images.forEach(f => form.append('images', f))
    if (Array.isArray(data?.img)) form.append('img', JSON.stringify(data.img))
    return axiosClient.post<AdminProduct>('/products', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  update(id: number, payload: ProductFormPayload) {
    const form = new FormData()
    const data = ((payload as { product?: Record<string, unknown> }).product ||
      payload) as Record<string, unknown>
    if (data?.name !== undefined) form.append('name', String(data.name))
    if (data?.description !== undefined)
      form.append('description', String(data.description))
    if (data?.price !== undefined) form.append('price', String(data.price))
    if (data?.discount !== undefined)
      form.append('discount', String(data.discount))
    if (data?.quantity !== undefined)
      form.append('quantity', String(data.quantity))
    if (data?.weight_grams !== undefined)
      form.append('weight_grams', String(data.weight_grams))
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
    if (data?.variants !== undefined)
      form.append('variants', JSON.stringify(data.variants))
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
  // An/hien san pham tren san (nguoi mua khong thay hang an)
  setVisibility(id: number, is_active: boolean) {
    return axiosClient.patch(`/products/${id}/visibility`, { is_active })
  },
  // Kiem duyet: admin go / khoi phuc san pham vi pham
  takedown(id: number, reason: string) {
    return axiosClient.patch(`/products/${id}/takedown`, { reason })
  },
  restore(id: number) {
    return axiosClient.patch(`/products/${id}/restore`)
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
