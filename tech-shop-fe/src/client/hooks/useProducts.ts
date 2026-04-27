import { useQuery } from '@tanstack/react-query'
import {
  fetchNewProducts,
  fetchPopularProducts,
  fetchCollectionProducts,
  fetchProductById,
  fetchSimilarProducts,
  fetchSimilarProductsByCategory,
  fetchReview,
  searchProducts,
  fetchProductsByCategory
} from '../services/productService'
import type { ListProductRes, Product } from '../types/product'
import type { ReviewRes } from '../types/review'

export const useNewProducts = () =>
  useQuery<ListProductRes>({
    queryKey: ['newProducts'],
    queryFn: fetchNewProducts,
    staleTime: 5 * 60 * 1000
  })

export const usePopularProducts = () =>
  useQuery<ListProductRes>({
    queryKey: ['popularProducts'],
    queryFn: fetchPopularProducts,
    staleTime: 5 * 60 * 1000
  })

export const useCollectionProducts = (
  category_id: string,
  sort: string,
  filter: string,
  page: number,
  limit: number,
  enabled: boolean = true
) =>
  useQuery<ListProductRes>({
    queryKey: ['collectionProducts', category_id, sort, filter, page, limit],
    queryFn: () =>
      fetchCollectionProducts(category_id, sort, filter, page, limit),
    enabled: enabled && !!category_id,
    staleTime: 5 * 60 * 1000
  })

export const useProductById = (productId: number) =>
  useQuery<Product>({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId),
    enabled: !!productId,
    staleTime: 10 * 60 * 1000
  })

export const useSimilarProducts = (productId: number, limit?: number) =>
  useQuery<ListProductRes>({
    queryKey: ['similarProducts', productId, limit],
    queryFn: () => fetchSimilarProducts(productId, limit),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000
  })

// Legacy hook for category-based similar products
export const useSimilarProductsByCategory = (categoryId: number) =>
  useQuery<ListProductRes>({
    queryKey: ['similarProductsByCategory', categoryId],
    queryFn: () => fetchSimilarProductsByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000
  })

export const useProductReviews = (productId: number) =>
  useQuery<ReviewRes>({
    queryKey: ['reviews', productId],
    queryFn: () => fetchReview(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000
  })

export type SearchOptions = {
  category_id?: number | string
  sub_category_id?: number | string
  price_min?: number
  price_max?: number
  rating_min?: number
  sort?: 'price-asc' | 'price-desc' | 'rating' | 'popular' | 'newest'
  page?: number
  limit?: number
}

export const useSearchProducts = (query: string, options?: SearchOptions) =>
  useQuery<ListProductRes>({
    queryKey: ['searchProducts', query, options],
    queryFn: () => searchProducts({ query, ...options }),
    enabled: !!query?.trim(),
    staleTime: 60 * 1000
  })

export const useProductsByCategory = (categoryId: number) =>
  useQuery<ListProductRes>({
    queryKey: ['productsByCategory', categoryId],
    queryFn: () => fetchProductsByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000
  })
