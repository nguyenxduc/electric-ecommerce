export type ProductSpecMeta = {
  key: string
  label: string
  options: string[]
}

export type FilterMetadataResponse = ProductSpecMeta[]

export type FilterOption = {
  id: string
  key: string
  label: string
  value: string
  display_value?: string | null
  query_value?: string | null
  category_id: string | null
  category?: {
    id: string
    name: string
  } | null
  filter_key?: {
    id: string
    key: string
    label: string
    data_type: string
  } | null
  order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FilterOptionListResponse = FilterOption[]

export type FilterOptionResponse = {
  success: boolean
  data: FilterOption
}

export type FilterOptionListResponseWithSuccess = {
  success: boolean
  data: FilterOption[]
  pagination?: {
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

export type CreateFilterOptionRequest = {
  filter_key_id: string
  value: string
  display_value?: string | null
  query_value?: string | null
  category_id?: number | null
  order?: number
  is_active?: boolean
}

export type UpdateFilterOptionRequest = {
  filter_key_id?: string
  value?: string
  display_value?: string | null
  query_value?: string | null
  category_id?: number | null
  order?: number
  is_active?: boolean
}
