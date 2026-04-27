import { useQuery } from '@tanstack/react-query'
import {
  fetchPublicSettings,
  type PublicSettingsResponse
} from '../services/settingService'

export const usePublicSettings = (category?: string) => {
  return useQuery<PublicSettingsResponse, Error>({
    queryKey: ['publicSettings', category],
    queryFn: () => fetchPublicSettings(category),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  })
}
