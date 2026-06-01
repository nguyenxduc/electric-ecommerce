import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getReviewsByProduct,
  createReview,
  updateReview,
  deleteReview,
  getProductReviewStats,
  type ReviewResponse,
  type CreateReviewPayload,
  type UpdateReviewPayload
} from '../services/reviewService'

export const useProductReviews = (productId: number, page: number = 1, limit: number = 10) => {
  return useQuery<ReviewResponse, Error>({
    queryKey: ['reviews', productId, page, limit],
    queryFn: () => getReviewsByProduct(productId, page, limit),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useProductReviewStats = (productId: number) => {
  return useQuery({
    queryKey: ['review-stats', productId],
    queryFn: () => getProductReviewStats(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateReview = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => createReview(payload),
    onSuccess: (_, variables) => {
      // Invalidate reviews for this product
      qc.invalidateQueries({ queryKey: ['reviews', variables.productId] })
      qc.invalidateQueries({ queryKey: ['review-stats', variables.productId] })
      // Also invalidate product details to update rating
      qc.invalidateQueries({ queryKey: ['product', variables.productId] })
    }
  })
}

export const useUpdateReview = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: number; payload: UpdateReviewPayload }) =>
      updateReview(reviewId, payload),
    onSuccess: (data) => {
      const productId = parseInt(data.review.product_id)
      qc.invalidateQueries({ queryKey: ['reviews', productId] })
      qc.invalidateQueries({ queryKey: ['review-stats', productId] })
      qc.invalidateQueries({ queryKey: ['product', productId] })
    }
  })
}

export const useDeleteReview = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteReview,
    onSuccess: (_, reviewId) => {
      // We need productId to invalidate, but we don't have it here
      // So we'll invalidate all review queries
      qc.invalidateQueries({ queryKey: ['reviews'] })
      qc.invalidateQueries({ queryKey: ['review-stats'] })
    }
  })
}

