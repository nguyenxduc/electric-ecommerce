import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminGetNotifications,
  adminCreateNotification
} from '../services/notificationService'

const keys = {
  all:  ['admin', 'notifications'] as const,
  list: (p?: object) => [...keys.all, 'list', p] as const
}

export const useAdminNotifications = (params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}) =>
  useQuery({
    queryKey: keys.list(params),
    queryFn:  () => adminGetNotifications(params),
    staleTime: 30 * 1000
  })

export const useCreateNotification = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminCreateNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    }
  })
}
