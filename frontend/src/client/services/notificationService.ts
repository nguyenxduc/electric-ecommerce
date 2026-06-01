import axiosClient from '../../lib/axios'

export type Notification = {
  id: string | number
  user_id?: string | number | null
  title: string
  message: string
  type?: string | null
  is_read: boolean
  created_at: string
  read_at?: string | null
}

export type NotificationListResponse = {
  notifications: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const getNotifications = async (params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}): Promise<NotificationListResponse> => {
  const { data } = await axiosClient.get<{
    success: boolean
    data: NotificationListResponse
  }>('/notifications', { params })
  return data.data
}

export const markRead = async (ids: (string | number)[]) => {
  const { data } = await axiosClient.post('/notifications/mark-read', { ids })
  return data
}

// Admin only
export const createNotification = async (payload: {
  title: string
  message: string
  type?: string
  user_id?: string | number | null
}) => {
  const { data } = await axiosClient.post('/notifications', payload)
  return data
}
