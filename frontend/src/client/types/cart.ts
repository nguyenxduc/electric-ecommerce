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
  color: {
    code: string
    name: string
  }
}

export type Cart = {
  id: number
  total_items: number
  total_price: number
  total_original_price: number
  total_discount: number
  items: CartItem[]
}
