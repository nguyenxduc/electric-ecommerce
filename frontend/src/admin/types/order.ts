import { SuccessResponse } from './common'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type AdminOrderItem = {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number | string
  total_price: number | string
  color?: string | null
  created_at?: string
  updated_at?: string
  // Danh sach don cua shop include product (id, name, img)
  product?: {
    id: number
    name: string
    img?: string[] | null
    image_url?: string | null
  } | null
  variant?: { name?: string | null } | null
  variant_name?: string | null
}

export type ShippingAddress = {
  name?: string
  phone?: string
  address?: string
  street?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
}

export type AdminOrder = {
  id: number
  user_id: number
  order_number?: string
  total_amount: number | string
  status: OrderStatus
  shipping_address?: ShippingAddress | null
  payment_method?: string | null
  coupon_id?: number | null
  created_at?: string
  updated_at?: string
  order_items: AdminOrderItem[]
  user?: { id: number; name: string; email?: string }
  receiver_name?: string | null
  receiver_phone?: string | null
  shop?: { id?: number; name?: string } | null
}

export type OrderResponse = AdminOrder

export type CreateOrderRequest = {
  items: Array<{ product_id: number; quantity: number; color?: string }>
  shipping_address?: ShippingAddress
  payment_method?: string
  coupon_code?: string
}

export type CreateOrderResponse = {
  message: string
  order: AdminOrder
}

export type CancelOrderResponse = SuccessResponse<{
  message: string
  order: AdminOrder
}>

export type UpdateOrderStatusRequest = {
  status: OrderStatus
}

export type UpdateOrderStatusResponse = SuccessResponse<{
  message: string
  order: AdminOrder
}>

export type OrderStatsResponse = {
  total_orders: number
  pending_orders: number
  revenue: number
  recent_orders: AdminOrder[]
}

export type OrderPagination = {
  current_page: number
  per_page: number
  total_count: number
  total_pages: number
}

export type OrderListResponse = {
  orders: AdminOrder[]
  pagination: OrderPagination
}
