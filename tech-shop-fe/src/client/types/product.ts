import { Category } from './category'

export type Product = {
  id: number
  name: string
  price: number
  final_price: number
  discount: number
  discount_percentage?: number
  quantity: number
  sold: number
  rating: number
  img: string[]
  specs: { label: string; value: string }[]
  specs_detail: { label: string; value: string }[]
  color: { name: string; code: string; quantity?: number }[]
  available_colors?: { name: string; code: string; quantity?: number }[]
  category_id: number
  sub_category_id: number
  description: string
}

export type Pagination = {
  current_page: number
  per_page: number
  total_count: number
  total_pages: number
}

export type ProductRes = {
  product: Product
}

export type ListProductRes = {
  products: Product[]
  pagination: Pagination
}

export type RecommendationData = {
  products: Product[]
  strategy: string
}

export type RecommendationRes = {
  success: boolean
  data: RecommendationData
}
