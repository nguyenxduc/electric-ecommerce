import { Pagination, SuccessResponse } from './common'
import { AdminCategory } from './category'

export type SpecEntry = { label: string; value: any }

export type ProductColor = { name: string; code: string; quantity?: number }

export type AdminProduct = {
  id: number
  name: string
  price: number
  discount?: number
  quantity?: number
  sold?: number
  rating?: number
  number_of_ratings?: number
  img?: string[]
  specs?: SpecEntry[]
  specs_detail?: SpecEntry[]
  color?: ProductColor[]
  category_id: number
  sub_category_id: number
  final_price?: number
  in_stock?: boolean
  available_colors?: ProductColor[]
  category?: Pick<AdminCategory, 'id' | 'name'>
  sub_category?: { id: number; name: string }
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
