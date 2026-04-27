import { useQuery } from '@tanstack/react-query'
import {
  fetchAllFilter,
  fetchFilterByCategory
} from '../services/filterService'

export const useAllFilters = () => {
  return useQuery({
    queryKey: ['allFilters'],
    queryFn: fetchAllFilter,
    staleTime: 10 * 60 * 1000
  })
}

export const useFilterByCategory = (category_id: number) => {
  return useQuery({
    queryKey: ['useFilterByCategory', category_id],
    queryFn: () => fetchFilterByCategory(category_id),
    staleTime: 10 * 60 * 1000
  })
}
