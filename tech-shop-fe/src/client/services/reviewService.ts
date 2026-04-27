import axiosClient from '../../lib/axios'

export type Review = {
  id: string
  user_id: string
  product_id: string
  rating: number | null
  comment: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
  }
}

export type ReviewResponse = {
  reviews: Review[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  summary: {
    average_rating: number
    total_reviews: number
  }
}

export type CreateReviewPayload = {
  productId: number
  rating: number
  comment?: string
}

export type UpdateReviewPayload = {
  rating?: number
  comment?: string
}

export const getReviewsByProduct = async (
  productId: number,
  page: number = 1,
  limit: number = 10
): Promise<ReviewResponse> => {
  const { data } = await axiosClient.get<ReviewResponse>(`/reviews/product/${productId}`, {
    params: { page, limit }
  })
  return data
}

export const createReview = async (payload: CreateReviewPayload): Promise<{ message: string; review: Review }> => {
  const { data } = await axiosClient.post<{ message: string; review: Review }>('/reviews', payload)
  return data
}

export const updateReview = async (
  reviewId: number,
  payload: UpdateReviewPayload
): Promise<{ message: string; review: Review }> => {
  const { data } = await axiosClient.put<{ message: string; review: Review }>(`/reviews/${reviewId}`, payload)
  return data
}

export const deleteReview = async (reviewId: number): Promise<{ message: string }> => {
  const { data } = await axiosClient.delete<{ message: string }>(`/reviews/${reviewId}`)
  return data
}

export const getProductReviewStats = async (productId: number) => {
  const { data } = await axiosClient.get(`/reviews/product/${productId}/stats`)
  return data
}

