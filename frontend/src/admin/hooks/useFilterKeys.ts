import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchFilterKeys,
  fetchFilterKey,
  createFilterKey,
  updateFilterKey,
  deleteFilterKey,
  type FilterKey,
  type CreateFilterKeyPayload,
  type UpdateFilterKeyPayload
} from '../services/filterKeyService'

export const useFilterKeys = (params?: {
  page?: number
  limit?: number
  q?: string
  is_active?: boolean
}) => {
  return useQuery({
    queryKey: ['admin', 'filterKeys', params],
    queryFn: () => fetchFilterKeys(params)
  })
}

export const useFilterKey = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'filterKey', id],
    queryFn: () => fetchFilterKey(id),
    enabled: !!id
  })
}

export const useCreateFilterKey = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createFilterKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filterKeys'] })
    }
  })
}

export const useUpdateFilterKey = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateFilterKeyPayload) =>
      updateFilterKey(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filterKeys'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'filterKey', id] })
    }
  })
}

export const useDeleteFilterKey = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFilterKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'filterKeys'] })
    }
  })
}
export const useActiveFilterKeys = () => {
  return useQuery({
    queryKey: ['admin', 'filterKeys', 'active'],
    queryFn: async () => {
      const response = await fetchFilterKeys()
      return {
        ...response,
        data: response.data.filter(key => key.is_active)
      }
    }
  })
}
