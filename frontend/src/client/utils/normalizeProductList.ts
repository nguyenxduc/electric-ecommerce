import type { ListProductRes, Pagination } from '../types/product'

export const normalizePagination = (
  raw?: Partial<Pagination> | null,
  fallbackPageSize = 12
): Pagination => {
  const per_page = Math.max(1, Number(raw?.per_page) || fallbackPageSize)
  const total_count = Math.max(0, Number(raw?.total_count) || 0)
  const current_page = Math.max(1, Number(raw?.current_page) || 1)
  const computedPages =
    total_count === 0 ? 0 : Math.ceil(total_count / per_page)
  const total_pages = Math.max(
    computedPages,
    Number(raw?.total_pages) || 0
  )

  return {
    current_page,
    per_page,
    total_count,
    total_pages
  }
}

export const normalizeListProductRes = (
  data: ListProductRes,
  fallbackPageSize = 12
): ListProductRes => ({
  products: data.products ?? [],
  pagination: normalizePagination(data.pagination, fallbackPageSize)
})

export const shouldShowPagination = (pagination: Pagination) =>
  pagination.total_count > pagination.per_page
