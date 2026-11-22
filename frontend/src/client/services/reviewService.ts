import axiosClient from '../../lib/axios'

export type Review = {
  id: string
  user_id: string
  product_id: string
  rating: number | null
  comment: string | null
  images: string[]
  seller_reply: string | null
  seller_reply_at: string | null
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
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
  }
  summary: {
    average_rating: number
    total_reviews: number
  }
}

// Bo loc danh sach: so sao, chi danh gia co anh
export type ReviewFilter = { rating?: number; has_images?: boolean }

export type ReviewStats = {
  totalReviews: number
  averageRating: number
  ratingDistribution: { rating: number; count: number }[]
  withImages: number
}

export type CreateReviewPayload = {
  productId: number
  rating: number
  comment?: string
  images?: File[]
}

export type UpdateReviewPayload = {
  rating?: number
  comment?: string
  // Anh cu giu lai; anh khong co trong mang bi go
  keep_images?: string[]
  images?: File[]
}

// Gui multipart de kem anh (field `images`, toi da 5)
const toReviewForm = (fields: Record<string, string | number | undefined>, images: File[] = []) => {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, String(v))
  images.forEach(f => form.append('images', f))
  return form
}
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

export const getReviewsByProduct = async (
  productId: number,
  page: number = 1,
  limit: number = 10,
  filter: ReviewFilter = {}
): Promise<ReviewResponse> => {
  const { data } = await axiosClient.get<ReviewResponse>(`/reviews/product/${productId}`, {
    params: { page, limit, rating: filter.rating, has_images: filter.has_images || undefined }
  })
  return data
}

export const createReview = async (payload: CreateReviewPayload): Promise<{ message: string; review: Review }> => {
  const { images, ...fields } = payload
  const { data } = await axiosClient.post<{ message: string; review: Review }>(
    '/reviews',
    toReviewForm(fields, images),
    multipart
  )
  return data
}

export const updateReview = async (
  reviewId: number,
  payload: UpdateReviewPayload
): Promise<{ message: string; review: Review }> => {
  const { images, keep_images, ...fields } = payload
  const form = toReviewForm(
    { ...fields, keep_images: keep_images && JSON.stringify(keep_images) },
    images
  )
  const { data } = await axiosClient.put<{ message: string; review: Review }>(
    `/reviews/${reviewId}`,
    form,
    multipart
  )
  return data
}

export const deleteReview = async (reviewId: number): Promise<{ message: string }> => {
  const { data } = await axiosClient.delete<{ message: string }>(`/reviews/${reviewId}`)
  return data
}

export const getProductReviewStats = async (productId: number): Promise<ReviewStats> => {
  const { data } = await axiosClient.get<ReviewStats>(`/reviews/product/${productId}/stats`)
  return data
}

