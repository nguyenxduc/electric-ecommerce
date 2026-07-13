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
  shop?: {
    id: number
    name: string
    slug: string
  }
  order_group?: {
    id: number
    group_number: string
  }
  return_request?: {
    id: number
    status: 'pending' | 'approved' | 'rejected'
    reason: string
    resolution_note: string | null
  } | null
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
      image_url?: string
    }
  }>
}

export type OrderGroup = {
  id: number
  group_number: string
  subtotal_amount: number
  tier_discount: number
  coupon_discount: number
  total_amount: number
  payment_method: string | null
  created_at: string
}

// One checkout produces one OrderGroup with one Order per shop.
export type CreateOrderResponse = {
  message: string
  order_group: OrderGroup
  orders: Order[]
  subtotal?: number
  amountAfterTierDiscount?: number
  tierDiscount?: number
  tierDiscountRate?: number
  discount?: number
  finalAmount?: number
}

export const createOrder = async (
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> => {
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

// Request a return/refund on a delivered order
export const requestReturn = async (orderId: number, reason: string) => {
  const { data } = await axiosClient.post('/returns', {
    order_id: orderId,
    reason
  })
  return data
}

