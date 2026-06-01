import { Category } from './category'

export type ProductSpec = { label: string; value: string }

export type ProductSpecDetail =
  | ProductSpec
  | {
      category: string
      items: ProductSpec[]
    }

export type ProductColor = {
  name: string
  code: string
  quantity?: number
}

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
  specs: ProductSpec[]
  specs_detail: ProductSpecDetail[]
  color?: ProductColor[] | ProductColor | string | null
  available_colors?: ProductColor[]
  category_id: number
  sub_category_id: number
  description: string
}

export type AiProductComparison = {
  form_version: string
  summary: string
  recommendation: string
  best_choice: {
    product_id: number
    reason: string
  }
  product_assessments: {
    product_id: number
    strengths: string[]
    limitations: string[]
    best_for: string
  }[]
  rows: {
    feature: string
    insight: string
    values: {
      product_id: number
      value: string
    }[]
  }[]
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
