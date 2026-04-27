import { useQuery } from '@tanstack/react-query';
import { fetchNewProducts, fetchPopularProducts, fetchSimilarProducts } from '../services/productService';
import { ListProductRes } from '../types/product';

export const useNewProducts = () => {
  return useQuery({
    queryKey: ['newProducts'],
    queryFn: fetchNewProducts,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePopularProducts = () => {
  return useQuery({
    queryKey: ['popularProducts'],
    queryFn: fetchPopularProducts,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSimilarProduct = (categoryId: number) => {
  return useQuery<ListProductRes>({
    queryKey: ['similarProducts', categoryId],
    queryFn: () => fetchSimilarProducts(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  })
}
