import axiosClient from '../../lib/axios'

export type FilterKey = {
  id: string
  key: string
  label: string
  description: string | null
  data_type: 'string' | 'number' | 'boolean' | 'range'
  is_active: boolean
  order: number
  created_at: string
  updated_at: string
  options_count?: number
}

export type FilterKeyResponse = {
  success: boolean
  data: FilterKey[]
}

export type SingleFilterKeyResponse = {
  success: boolean
  data: FilterKey
}

export type CreateFilterKeyPayload = {
  key: string
  label: string
  description?: string
  data_type?: 'string' | 'number' | 'boolean' | 'range'
  is_active?: boolean
  order?: number
}

export type UpdateFilterKeyPayload = Partial<
  Omit<CreateFilterKeyPayload, 'key'>
>

export const fetchFilterKeys = async (params?: {
  page?: number
  limit?: number
  q?: string
  is_active?: boolean
}): Promise<
  FilterKeyResponse & {
    pagination?: {
      current_page: number
      per_page: number
      total_count: number
      total_pages: number
    }
  }
> => {
  const { data } = await axiosClient.get<
    FilterKeyResponse & {
      pagination?: {
        current_page: number
        per_page: number
        total_count: number
        total_pages: number
      }
    }
  >('/filter/keys', { params })
  return data
}

export const fetchFilterKey = async (
  id: string
): Promise<SingleFilterKeyResponse> => {
  const { data } = await axiosClient.get<SingleFilterKeyResponse>(
    `/filter/keys/${id}`
  )
  return data
}

export const createFilterKey = async (
  payload: CreateFilterKeyPayload
): Promise<SingleFilterKeyResponse> => {
  const { data } = await axiosClient.post<SingleFilterKeyResponse>(
    '/filter/keys',
    payload
  )
  return data
}

export const updateFilterKey = async (
  id: string,
  payload: UpdateFilterKeyPayload
): Promise<SingleFilterKeyResponse> => {
  const { data } = await axiosClient.put<SingleFilterKeyResponse>(
    `/filter/keys/${id}`,
    payload
  )
  return data
}

export const deleteFilterKey = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const { data } = await axiosClient.delete(`/filter/keys/${id}`)
  return data
}
