import axiosClient from '../../lib/axios'
import type { ListProductRes, Product } from '../types/product'
import type { ReviewRes } from '../types/review'

export const fetchNewProducts = async (): Promise<ListProductRes> => {
  const { data } = await axiosClient.get<ListProductRes>('/products', {
    params: { sort: 'newest', page: 1, limit: 40 }
  })
  return data
}

export const fetchPopularProducts = async (): Promise<ListProductRes> => {
  const { data } = await axiosClient.get<ListProductRes>('/products', {
    params: { sort: 'popular', page: 1, limit: 40 }
  })
  return data
}

export const fetchCollectionProducts = async (
  category_id: string,
  sort: string,
  filter: string,
  page: number,
  limit: number
): Promise<ListProductRes> => {
  const params: Record<string, any> = { sort, page, limit }
  if (filter) {
    // filter string may look like "key=value&key2=value2"
    new URLSearchParams(filter).forEach((v, k) => (params[k] = v))
  }
  if (category_id !== 'all') params.category_id = category_id
  const { data } = await axiosClient.get<ListProductRes>('/products', {
    params
  })
  return data
}

export const fetchProductById = async (id: number): Promise<Product> => {
  const { data } = await axiosClient.get<Product>(`/products/${id}`)
  return data
}

export const fetchSimilarProducts = async (
  productId: number,
  limit: number = 6
): Promise<ListProductRes> => {
  const { data } = await axiosClient.get<ListProductRes>(
    `/products/${productId}/similar`,
    {
      params: { limit }
    }
  )
  return data
}

// Legacy function for category-based similar products (keeping for backward compatibility)
export const fetchSimilarProductsByCategory = async (
  categoryId: number
): Promise<ListProductRes> => {
  const { data } = await axiosClient.get<ListProductRes>('/products', {
    params: { category_id: categoryId, page: 1, limit: 15 }
  })
  return data
}

export const fetchReview = async (product_id: number): Promise<ReviewRes> => {
  const { data } = await axiosClient.get<ReviewRes>(
    `/products/${product_id}/reviews`
  )
  return data
}

type SearchParams = {
  query: string
  category_id?: number | string
  sub_category_id?: number | string
  price_min?: number
  price_max?: number
  rating_min?: number
  sort?: 'price-asc' | 'price-desc' | 'rating' | 'popular' | 'newest'
  page?: number
  limit?: number
}

export const searchProducts = async (
  params: SearchParams | string
): Promise<ListProductRes> => {
  const normalized =
    typeof params === 'string'
      ? { query: params }
      : { sort: 'newest', page: 1, limit: 20, ...params }

  const { data } = await axiosClient.get<ListProductRes>('/products/search', {
    params: normalized
  })
  return data
}

export const fetchProductsByCategory = async (
  categoryId: number
): Promise<ListProductRes> => {
  const { data } = await axiosClient.get<ListProductRes>(
    `/products/category/${categoryId}`
  )
  return data
}
