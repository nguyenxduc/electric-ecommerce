import { useQuery } from '@tanstack/react-query'
import {
  fetchCategories,
  fetchCategoryById,
  fetchCategoryBySlug,
  fetchSubCategoriesByCategory
} from '../services/categoryService'
import type { Categories, Category } from '../types/category'

export const useCategories = () =>
  useQuery<Categories>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000
  })

export const useCategoryById = (id: number) =>
  useQuery<Category>({
    queryKey: ['category', id],
    queryFn: () => fetchCategoryById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  })

export const useCategoryBySlug = (slug: string) =>
  useQuery<Category>({
    queryKey: ['category', 'slug', slug],
    queryFn: () => fetchCategoryBySlug(slug),
    enabled: !!slug && slug !== 'all',
    staleTime: 5 * 60 * 1000
  })

export const useSubCategoriesByCategory = (categoryId: number) =>
  useQuery<unknown>({
    queryKey: ['subCategoriesOfCategory', categoryId],
    queryFn: () => fetchSubCategoriesByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000
  })
