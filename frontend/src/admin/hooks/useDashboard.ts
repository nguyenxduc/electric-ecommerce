import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getTopProducts, getBehaviorAnalytics, getAdminTodo, getShopTodo, getShopFinance, type DashboardStatsResponse, type TopProductsResponse, type BehaviorAnalyticsResponse } from '../services/dashboardService'

export const useAdminTodo = () =>
  useQuery({ queryKey: ['admin', 'dashboard', 'todo'], queryFn: getAdminTodo, staleTime: 30 * 1000 })

export const useShopTodo = () =>
  useQuery({ queryKey: ['seller', 'dashboard', 'todo'], queryFn: getShopTodo, staleTime: 30 * 1000 })

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

export const useBehaviorAnalytics = (days?: number) => {
  return useQuery<BehaviorAnalyticsResponse, Error>({
    queryKey: ['admin', 'dashboard', 'behavior', days],
    queryFn: () => getBehaviorAnalytics(days),
    staleTime: 5 * 60 * 1000, // 5 minutes - du lieu rollup chi doi moi ngay mot lan
  })
}


export const useShopFinance = (params: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ['seller', 'dashboard', 'finance', params],
    queryFn: () => getShopFinance(params),
    staleTime: 30 * 1000
  })
