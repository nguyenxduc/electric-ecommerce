import { SuccessResponse } from './common'

export type AdminCategory = {
  id: number
  name: string
  image_url: string
  description?: string
  slug?: string
  sub_categories?: AdminSubCategory[]
}

export type CreateCategoryRequest = {
  category: {
    name: string
    image_url: string
    description?: string
  }
}

export type UpdateCategoryRequest = {
  category: Partial<{
    name: string
    image_url: string
    description: string
  }>
}

export type CategoryListResponse = {
  categories: AdminCategory[]
  pagination: {
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

export type CategoryResponse = AdminCategory

export type DeleteCategoryResponse = SuccessResponse<{
  message: string
}>

export type AdminSubCategory = {
  id: number
  name: string
  image_url: string
  description?: string
  category_id: number
  category?: Pick<AdminCategory, 'id' | 'name'>
}

export type CreateSubCategoryRequest = {
  sub_category: {
    name: string
    image_url: string
    description?: string
    category_id: number
  }
}

export type UpdateSubCategoryRequest = {
  sub_category: Partial<{
    name: string
    image_url: string
    description: string
    category_id: number
  }>
}

export type SubCategoryListResponse = AdminSubCategory[]

export type SubCategoryResponse = AdminSubCategory
