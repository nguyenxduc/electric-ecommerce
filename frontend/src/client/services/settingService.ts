import axiosClient from '../../lib/axios'

export type PublicSettingsResponse = {
  settings: Record<string, any>
}

export const fetchPublicSettings = async (
  category?: string
): Promise<PublicSettingsResponse> => {
  const params = category ? { category } : {}
  const { data } = await axiosClient.get<PublicSettingsResponse>(
    '/settings/public',
    { params }
  )

  console.log(data)
  return data
}
