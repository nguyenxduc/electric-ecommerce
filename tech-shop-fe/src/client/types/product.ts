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

export type ImageSearchDetected = {
  product_type: string
  brand: string
  line_or_model: string
  search_query: string
  summary: string
  confidence: number
}

export type ImageSearchData = {
  source: 'image'
  detected: ImageSearchDetected
  match_mode: 'exact' | 'related' | 'none'
  generated_query: string
  notice: string
  overview_pending?: boolean
  action_hint?: string
  suggested_queries?: string[]
  products: Product[]
  pagination: Pagination
}

export type ImageOverviewRes = {
  success: boolean
  data: {
    overview: string
  }
  message?: string
}

export type ImageSearchRes = {
  success: boolean
  data: ImageSearchData
  message?: string
}
