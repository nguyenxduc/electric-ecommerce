import { useQuery } from '@tanstack/react-query'
import { fetchMyOrders, type Order } from '../services/orderService'

export const useUserOrders = () =>
  useQuery<Order[]>({
    queryKey: ['userOrders'],
    queryFn: fetchMyOrders,
    staleTime: 5 * 60 * 1000
  })

