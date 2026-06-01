export type Pagination = {
  current_page: number
  total_pages: number
  total_count: number
  per_page?: number
}

export type SuccessResponse<T> = {
  success: true
} & T

export type ErrorResponse = {
  success?: false
  error?: string
  errors?: string[]
}
