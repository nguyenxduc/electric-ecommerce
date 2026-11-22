import axiosClient from '../../lib/axios'

export type Notification = {
  id: string | number
  user_id?: string | number | null
  title: string
  message: string
  type?: string | null
  // Duong dan noi bo khi bam vao thong bao (vd. /profile?tab=orders&order=12)
  link?: string | null
  is_read: boolean
  created_at: string
  read_at?: string | null
}

// Tab cua chuong thong bao; SYSTEM gom moi loai khac ORDER/PROMO
export type NotificationTab = 'ORDER' | 'PROMO' | 'SYSTEM'

export type NotificationListResponse = {
  notifications: Notification[]
  unread: Record<NotificationTab | 'total', number>
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
  type?: NotificationTab
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

export const markAllRead = async () => {
  const { data } = await axiosClient.post('/notifications/mark-read', { all: true })
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
