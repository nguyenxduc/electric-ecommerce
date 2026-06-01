import axiosClient from '../../lib/axios'
import {
  AdminReview,
  CreateReviewRequest,
  ListProductReviewsResponse,
  ReviewMutationResponse
} from '../types'

export const adminReviewService = {
  list(product_id: number, params?: { page?: number; limit?: number }) {
    return axiosClient.get<ListProductReviewsResponse>(
      `/reviews/product/${product_id}`,
      { params }
    )
  },
  create(product_id: number, payload: CreateReviewRequest) {
    return axiosClient.post<ReviewMutationResponse>(
      `/reviews`,
      { ...payload, productId: product_id }
    )
  },
  update(product_id: number, id: number, payload: CreateReviewRequest) {
    return axiosClient.put<ReviewMutationResponse>(`/reviews/${id}`, payload)
  },
  delete(id: number) {
    return axiosClient.delete(`/reviews/${id}`)
  }
}

export default adminReviewService
