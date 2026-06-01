import axiosClient from '../../lib/axios'

export type CreateOrderPayload = {
  items: Array<{
    product_id: number
    quantity: number
    color?: string | { name: string; code: string } | null
  }>
  shipping_address: {
    name: string
    phone: string
    address: string
  }
  payment_method: string
  coupon_code?: string
}

export type Order = {
  id: number
  order_number: string
  total_amount: number
  status: string
  shipping_address: any
  payment_method: string | null
  created_at: string
  order_items: Array<{
    id: number
    product_id: number
    quantity: number
    unit_price: number
    total_price: number
    color: string | null
    product: {
      id: number
      name: string
      img: string[]
    }
  }>
}

export const createOrder = async (
  payload: CreateOrderPayload
): Promise<{
  message: string
  order: Order
  subtotal?: number
  amountAfterTierDiscount?: number
  tierDiscount?: number
  tierDiscountRate?: number
  discount?: number
  finalAmount?: number
}> => {
  const { data } = await axiosClient.post('/orders', payload)
  return data
}

export const fetchMyOrders = async (): Promise<Order[]> => {
  const { data } = await axiosClient.get('/orders/user/orders')
  return data
}

export const cancelMyOrder = async (orderId: number) => {
  const { data } = await axiosClient.patch(`/orders/${orderId}/cancel`, {})
  return data
}

