import axiosClient from '../../lib/axios'

export type PublicSettingsResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- gia tri setting hien thi truc tiep, nhieu kieu
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
