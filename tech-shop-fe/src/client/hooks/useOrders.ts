import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOrder, type CreateOrderPayload } from '../services/orderService'

export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      // Invalidate cart to refresh it after order creation
      qc.invalidateQueries({ queryKey: ['cart'] })
    }
  })
}

