import { SuccessResponse } from './common'
import { AdminCategory } from './category'

export type SpecEntry = { label: string; value: unknown }
// specs_detail: dong phang hoac nhom {category, items}
export type SpecDetailEntry = SpecEntry | { category: string; items: SpecEntry[] }

// Payload phang tu form tao/sua san pham (service tu dong goi thanh FormData)
export type ProductFormPayload = Record<string, unknown> & { images?: File[] }

export type ProductColor = { name: string; code: string; quantity?: number }

export type ProductVariant = {
  id?: number
  sku: string
  name: string
  attributes?: Record<string, string>
  price_delta?: number
  quantity?: number
}

export type AdminProduct = {
  id: number
  name: string
  price: number
  discount?: number
  quantity?: number
  weight_grams?: number
  sold?: number
  rating?: number
  number_of_ratings?: number
  img?: string[]
  specs?: SpecEntry[]
  specs_detail?: SpecDetailEntry[]
  color?: ProductColor[]
  description?: string | null
  // false = nguoi ban da an khoi san
  is_active?: boolean
  // Admin go vi pham: chi admin khoi phuc duoc
  takedown_reason?: string | null
  taken_down_at?: string | null
  category_id: number
  sub_category_id: number
  final_price?: number
  in_stock?: boolean
  available_colors?: ProductColor[]
  variants?: ProductVariant[]
  category?: Pick<AdminCategory, 'id' | 'name'>
  sub_category?: { id: number; name: string }
  shop?: { id?: number; name?: string } | null
}

export type CreateProductRequest = {
  product: {
    name: string
    price: number
    discount?: number
    quantity?: number
    sold?: number
    rating?: number
    category_id: number
    sub_category_id: number
    img?: string[]
    specs?: SpecEntry[]
    specs_detail?: SpecEntry[]
    color?: ProductColor[]
    variants?: ProductVariant[]
  }
}

export type UpdateProductRequest = {
  product: Partial<CreateProductRequest['product']>
}

export type ProductListQuery = {
  search?: string
  category_id?: number
  sub_category_id?: number
  in_stock?: boolean
  price_min?: number
  price_max?: number
  discount?: boolean
  brands?: string
  ram?: string
  screen_size?: string
  processor?: string
  gpu_brand?: string
  drive_size?: string
  sort?:
    | 'price-asc'
    | 'price-desc'
    | 'featured'
    | 'rating'
    | 'newest'
    | 'popular'
  page?: number
  limit?: number
}

export type ProductListResponse = {
  products: AdminProduct[]
  pagination: {
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

export type ProductResponse = AdminProduct

export type AddSalesRequest = {
  amount: number
  color_name: string
}

export type AddSalesResponse = SuccessResponse<{
  message: string
  product: AdminProduct
}>

export type AddRatingRequest = {
  rating: number
}

export type AddRatingResponse = SuccessResponse<{
  message: string
  product: Pick<AdminProduct, 'id' | 'rating' | 'number_of_ratings'>
}>
