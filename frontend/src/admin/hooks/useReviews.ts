import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import adminReviewService from '../services/reviewService'
import {
  AdminReview,
  CreateReviewRequest,
  ListProductReviewsResponse,
  ReviewMutationResponse
} from '../types'

const reviewKeys = {
  all: ['admin', 'reviews'] as const,
  list: (product_id: number, params?: { page?: number; limit?: number }) =>
    [...reviewKeys.all, product_id, params] as const
}

export function useAdminProductReviews(
  product_id: number,
  params?: { page?: number; limit?: number }
) {
  return useQuery<{ data: ListProductReviewsResponse }, Error>({
    queryKey: reviewKeys.list(product_id, params),
    queryFn: () => adminReviewService.list(product_id, params),
    enabled: !!product_id
  })
}

export function useCreateAdminReview(product_id: number) {
  const qc = useQueryClient()
  return useMutation<
    { data: ReviewMutationResponse },
    Error,
    CreateReviewRequest
  >({
    mutationFn: payload => adminReviewService.create(product_id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all })
    }
  })
}

export function useUpdateAdminReview(product_id: number, id: number) {
  const qc = useQueryClient()
  return useMutation<
    { data: ReviewMutationResponse },
    Error,
    CreateReviewRequest
  >({
    mutationFn: payload => adminReviewService.update(product_id, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all })
    }
  })
}

export function useDeleteAdminReview(product_id: number) {
  const qc = useQueryClient()
  return useMutation<{ data: unknown }, Error, number>({
    mutationFn: id => adminReviewService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all })
    }
  })
}
