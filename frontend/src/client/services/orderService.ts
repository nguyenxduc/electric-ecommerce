import axiosClient from '../../lib/axios'

export type CreateOrderPayload = {
  items: Array<{
    product_id: number
    quantity: number
    color?: string | { name: string; code: string } | null
    variant_id?: number
  }>
  shipping_address: {
    name: string
    phone: string
    address: string
    province?: string
    district?: string
    ward?: string
  }
  invoice_request?: {
    company_name: string
    tax_code: string
    address?: string
    email?: string
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
    variant_id?: number | null
    product: {
      id: number
      variants?: Array<{ id: number; name: string }>
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


export type ShippingQuote = {
  shops: Array<{ shop_id: number; shop_name: string; subtotal: number; weight_grams: number; shipping: number }>
  total: number
}

export const quoteShipping = async (payload: {
  items: Array<{ product_id: number; quantity: number }>
  shipping_address: CreateOrderPayload['shipping_address']
}): Promise<ShippingQuote> => {
  const { data } = await axiosClient.post('/shipping/quote', payload)
  return data.data
}

export type ShipmentEvent = { id: number; status: string; description: string | null; occurred_at: string }
export type Shipment = {
  id: number
  order_id: number
  carrier: string
  tracking_code: string | null
  status: string
  fee_vnd: number
  cod_amount_vnd: number
  events: ShipmentEvent[]
}

export const fetchShipment = async (orderId: number): Promise<Shipment | null> => {
  const { data } = await axiosClient.get(`/shipments/orders/${orderId}`)
  return data.data ?? null
}

export const fetchInvoice = async (orderId: number): Promise<{ id: number; invoice_number: string } | null> => {
  try {
    const { data } = await axiosClient.get(`/invoices/orders/${orderId}`)
    return data.data ?? null
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

// Fetch with the auth token, then open the HTML in a new tab via Blob URL
export const openInvoiceHtml = async (invoiceId: number) => {
  const { data } = await axiosClient.get(`/invoices/${invoiceId}/html`, {
    responseType: 'text',
    transformResponse: r => r
  })
  const url = URL.createObjectURL(new Blob([data], { type: 'text/html' }))
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const sendPhoneOtp = async (phone: string) => {
  const { data } = await axiosClient.post('/auth/phone/otp', { phone })
  return data as { message: string; data: { phone: string; expires_in: number; dev_code?: string } }
}

export const verifyPhoneOtp = async (phone: string, code: string) => {
  const { data } = await axiosClient.post('/auth/phone/verify', { phone, code })
  return data
}
