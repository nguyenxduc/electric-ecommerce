import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCart,
  addToCart as addToCartSvc,
  updateCartQuantity as updateQtySvc,
  removeCartItem as removeItemSvc,
  clearCart as clearCartSvc,
  type AddToCartPayload
} from '../services/cartService'
import { sendBehaviorBatch } from '../services/behaviorService'
import type { Cart } from '../types/cart'

export const useCart = () => {
  const hasToken = !!localStorage.getItem('accessToken')
  
  return useQuery<{ cart: Cart }>({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: hasToken, // Only fetch if token exists
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  })
}

export const useAddToCart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: number; payload: AddToCartPayload }) =>
      addToCartSvc(productId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      sendBehaviorBatch([
        {
          event_type: 'add_to_cart',
          product_id: variables.productId
        }
      ]).catch(() => {})
    }
  })
}

export const useUpdateCartQuantity = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      cartItemId,
    }: {
      productId: number
      quantity: number
      cartItemId?: number
    }) => updateQtySvc(productId, quantity, cartItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] })
  })
}

export const useRemoveCartItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, cartItemId }: { productId: number; cartItemId?: number }) =>
      removeItemSvc(productId, cartItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] })
  })
}

export const useClearCart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearCartSvc(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] })
  })
}
