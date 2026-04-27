import axiosClient from '../../lib/axios'

export type AiFeedbackStats = {
  summary: {
    total: number
    avg_rating: number
    positive: number
    negative: number
  } | null
  recentBad: Array<{
    id: string | number
    rating: number
    comment: string | null
    created_at: string
  }>
  byRating: Array<{ rating: number; count: number }>
}

export type AiFeedbackRow = {
  id: string | number
  ai_message_id: string | number
  user_id: string | number
  rating: number
  comment: string | null
  created_at: string
  message_preview: string | null
  chat_id: string | number | null
  chat_title: string | null
  user_id_feedback: string
}

export async function fetchAiFeedbackStats(days = 14) {
  const { data } = await axiosClient.get<{
    success: boolean
    data: AiFeedbackStats
  }>('/ai-assistant/feedback/stats', { params: { days } })
  return data.data
}

export async function fetchAiFeedbackList(params: {
  page?: number
  limit?: number
  min_rating?: number
  max_rating?: number
}) {
  const { data } = await axiosClient.get<{
    success: boolean
    data: {
      items: AiFeedbackRow[]
      pagination: {
        page: number
        limit: number
        total: number
        pages: number
      }
    }
  }>('/ai-assistant/feedback/list', { params })
  return data.data
}
