import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getTopProducts, type DashboardStatsResponse, type TopProductsResponse } from '../services/dashboardService'

export const useDashboardStats = () => {
  return useQuery<DashboardStatsResponse, Error>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: getDashboardStats,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

export const useTopProducts = (limit?: number) => {
  return useQuery<TopProductsResponse, Error>({
    queryKey: ['admin', 'dashboard', 'top-products', limit],
    queryFn: () => getTopProducts(limit),
    staleTime: 60 * 1000, // 1 minute
  })
}

