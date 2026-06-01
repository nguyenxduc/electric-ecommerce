import axiosClient from '../../lib/axios'

interface FilterResponse {
  success: boolean
  data: Array<{
    key: string
    label: string
    options: string[]
  }>
}

export const fetchAllFilter = async (): Promise<FilterResponse> => {
  const { data } = await axiosClient.get<FilterResponse>('/filter')
  return data
}

export const fetchFilterByCategory = async (
  category_id: number
): Promise<FilterResponse> => {
  const { data } = await axiosClient.get<FilterResponse>('/filter', {
    params: { category_id }
  })
  return data
}
