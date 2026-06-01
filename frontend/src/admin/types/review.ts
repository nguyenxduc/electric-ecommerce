import { SuccessResponse } from './common'

export type AdminReview = {
  id: number
  user_id: number
  product_id: number
  rating: number
  comment?: string
  created_at?: string
  updated_at?: string
  user?: {
    id: number
    name: string
  }
}

export type ReviewSummary = {
  average_rating: number
  total_reviews: number
}

export type ReviewPagination = {
  page: number
  limit: number
  total: number
  pages: number
}

export type ListProductReviewsResponse = {
  reviews: AdminReview[]
  pagination: ReviewPagination
  summary: ReviewSummary
}

export type CreateReviewRequest = {
  rating: number
  comment?: string
}

export type ReviewMutationResponse = {
  message: string
  review: AdminReview
}
