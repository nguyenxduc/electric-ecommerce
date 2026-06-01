import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  markRead as markReadSvc
} from '../services/notificationService'

const notifKeys = {
  all:    ['notifications'] as const,
  list:   (params?: object) => [...notifKeys.all, 'list', params] as const,
  unread: () => [...notifKeys.all, 'unread'] as const
}

export const useNotifications = (params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}) =>
  useQuery({
    queryKey: notifKeys.list(params),
    queryFn:  () => getNotifications(params),
    staleTime: 30 * 1000
  })

// Only fetch unread count (used by the bell badge)
export const useUnreadCount = () =>
  useQuery({
    queryKey: notifKeys.unread(),
    queryFn:  () => getNotifications({ unreadOnly: true, limit: 1 }),
    select:   data => data.pagination.total,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000  // poll every 60s
  })

export const useMarkRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markReadSvc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all })
    }
  })
}
