import { useQuery } from '@tanstack/react-query'
import {
  fetchAllFilter,
  fetchFilterByCategory
} from '../services/filterService'

export const useFilters = (categoryId?: number) => {
  return useQuery({
    queryKey: ['filters', categoryId],
    queryFn: () =>
      categoryId ? fetchFilterByCategory(categoryId) : fetchAllFilter(),
    staleTime: 5 * 60 * 1000
  })
}
