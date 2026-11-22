import axiosClient from '../../lib/axios'

export const MAX_QUESTION = 500

export type ProductQuestion = {
  id: string
  question: string
  answer: string | null
  answered_at: string | null
  created_at: string
  user: { id: string; name: string }
}

export type ProductQuestionPage = {
  questions: ProductQuestion[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number }
}

export const getProductQuestions = async (productId: number, page = 1) =>
  (await axiosClient.get(`/products/${productId}/questions`, { params: { page, limit: 10 } })).data
    .data as ProductQuestionPage

export const askProductQuestion = async (productId: number, question: string) =>
  (await axiosClient.post(`/products/${productId}/questions`, { question })).data.data as ProductQuestion

export const deleteProductQuestion = async (id: string) =>
  (await axiosClient.delete(`/product-questions/${id}`)).data
