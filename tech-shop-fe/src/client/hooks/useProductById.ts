import { useQuery } from '@tanstack/react-query'
import { fetchProductById } from '../services/productService'
import { fetchReview } from '../services/productService'

export const useProductById = (productId: number) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId),
    enabled: !!productId,
    staleTime: 10 * 60 * 1000
  })
}

export const useReviewByProduct = (productId: number) => {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => fetchReview(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000
  })
}
