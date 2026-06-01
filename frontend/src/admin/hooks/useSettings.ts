import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllSettings,
  fetchSettingByKey,
  upsertSetting,
  updateSetting,
  deleteSetting,
  type UpsertSettingPayload
} from '../services/settingService'

export const useSettings = (category?: string) => {
  return useQuery({
    queryKey: ['settings', category],
    queryFn: () => fetchAllSettings(category),
    staleTime: 60 * 1000
  })
}

export const useSettingByKey = (key: string) => {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: () => fetchSettingByKey(key),
    enabled: !!key,
    staleTime: 60 * 1000
  })
}

export const useUpsertSetting = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertSettingPayload) => upsertSetting(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    }
  })
}

export const useUpdateSetting = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: Partial<UpsertSettingPayload> }) =>
      updateSetting(key, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    }
  })
}

export const useDeleteSetting = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => deleteSetting(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    }
  })
}

