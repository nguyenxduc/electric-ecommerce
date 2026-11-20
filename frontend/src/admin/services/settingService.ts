import axiosClient from '../../lib/axios'

export type Setting = {
  id: number
  key: string
  value: string
  description: string | null
  category: string
  data_type: 'string' | 'number' | 'boolean' | 'json'
  is_public: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SettingResponse = {
  settings: Setting[]
}

export type SettingValue = string | number | boolean | object

export type UpsertSettingPayload = {
  key: string
  value: SettingValue
  description?: string
  category?: string
  data_type?: 'string' | 'number' | 'boolean' | 'json'
  is_public?: boolean
}

export const fetchAllSettings = async (category?: string): Promise<SettingResponse> => {
  const params = category ? { category } : {}
  const { data } = await axiosClient.get<SettingResponse>('/settings', { params })
  return data
}

export const fetchSettingByKey = async (key: string): Promise<{ parsedValue: unknown } & Setting> => {
  const { data } = await axiosClient.get<{ parsedValue: unknown } & Setting>(`/settings/${key}`)
  return data
}

export const upsertSetting = async (payload: UpsertSettingPayload): Promise<{ message: string; setting: Setting }> => {
  const { data } = await axiosClient.post('/settings', payload)
  return data
}

export const updateSetting = async (key: string, payload: Partial<UpsertSettingPayload>): Promise<{ message: string; setting: Setting }> => {
  const { data } = await axiosClient.put(`/settings/${key}`, payload)
  return data
}

export const deleteSetting = async (key: string): Promise<{ message: string }> => {
  const { data } = await axiosClient.delete(`/settings/${key}`)
  return data
}

