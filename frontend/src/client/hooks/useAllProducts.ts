import { useQuery } from '@tanstack/react-query'
import { fetchCollectionProducts } from '../services/productService'

export const useCollectionProducts = (
  category_id: string,
  sort: string,
  filter: string,
  page: number,
  limit: number
) => {
  return useQuery({
    queryKey: ['collectionProducts', category_id, sort, filter, page, limit],
    queryFn: () =>
      fetchCollectionProducts(category_id, sort, filter, page, limit),
    staleTime: 5 * 60 * 1000
  })
}
