import axiosClient from '../../lib/axios'

export type FilterOption = {
  key: string
  label: string
  options: string[]
}

export type FilterMetadataResponse = {
  success: boolean
  data: FilterOption[]
}

export const fetchAllFilter = async (): Promise<FilterMetadataResponse> => {
  const { data } = await axiosClient.get<FilterMetadataResponse>(
    '/filter/metadata'
  )
  return data
}

export const fetchFilterByCategory = async (
  categoryId: number
): Promise<FilterMetadataResponse> => {
  const { data } = await axiosClient.get<FilterMetadataResponse>(
    `/filter/metadata?category_id=${categoryId}`
  )
  return data
}
