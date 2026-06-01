import axiosClient from '../../lib/axios'
import type { Notification, NotificationListResponse } from '../../client/services/notificationService'

export type { Notification, NotificationListResponse }

export const adminGetNotifications = (params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}) =>
  axiosClient.get<{ success: boolean; data: NotificationListResponse }>(
    '/notifications',
    { params }
  )

export const adminCreateNotification = (payload: {
  title: string
  message: string
  type?: string
  user_id?: string | number | null
}) => axiosClient.post('/notifications', payload)
