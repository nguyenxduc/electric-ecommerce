export type CartItem = {
  id: number
  product_id: number
  name: string
  price: number
  final_price: number
  discount: number
  subtotal: number
  unit_final_price: number
  image_url: string
  sold_quantity: number
  max_quantity: number
  quantity: number
  variant?: {
    id: number
    sku: string
    name: string
    attributes?: Record<string, string> | null
    price_delta: number
  } | null
  color: {
    code: string
    name: string
  }
  shop?: {
    id: number
    name: string
    slug: string
    status: string
    shipping_fee_override?: number | null
    free_shipping_threshold_override?: number | null
  } | null
}

export type Cart = {
  id: number
  total_items: number
  total_price: number
  total_original_price: number
  total_discount: number
  items: CartItem[]
}
