import axiosClient from '../../lib/axios'

export type ProductReportGroup = {
  product: {
    id: number
    name: string
    taken_down_at: string | null
    takedown_reason: string | null
    shop: { name: string; slug: string } | null
  } | null
  count: number
  reasons: Record<string, number>
  latest_detail: string | null
  latest_at: string
}
export type ProductReportList = {
  reports: ProductReportGroup[]
  pagination: { current_page: number; per_page: number; total_count: number; total_pages: number }
}

export const fetchProductReports = async (params: {
  status: string
  page: number
  limit: number
}): Promise<ProductReportList> => (await axiosClient.get('/product-reports', { params })).data.data

export const resolveProductReports = async (productId: number, reason: string) =>
  (await axiosClient.post(`/product-reports/${productId}/resolve`, { reason })).data

export const dismissProductReports = async (productId: number) =>
  (await axiosClient.post(`/product-reports/${productId}/dismiss`)).data
