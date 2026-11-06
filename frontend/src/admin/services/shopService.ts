import axiosClient from '../../lib/axios'

export type AdminShop = {
  id: number
  owner_id: number
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  status: 'pending' | 'active' | 'rejected' | 'suspended'
  rejection_reason: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  tax_code?: string | null
  tax_entity_type?: 'household' | 'company'
  approved_at: string | null
  created_at: string
  owner?: { id: number; name: string | null; email: string | null; role: string | null }
  _count?: { products: number; orders: number }
}

export type AdminShopListResponse = {
  success: boolean
  data: {
    shops: AdminShop[]
    status_counts: Record<string, number>
    pagination: {
      current_page: number
      per_page: number
      total_count: number
      total_pages: number
    }
  }
}

export const adminShopService = {
  list(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    return axiosClient.get<AdminShopListResponse>('/shops/admin/all', { params })
  },
  approve(id: number) {
    return axiosClient.patch(`/shops/admin/${id}/approve`, {})
  },
  reject(id: number, reason?: string) {
    return axiosClient.patch(`/shops/admin/${id}/reject`, { reason })
  },
  suspend(id: number, reason?: string) {
    return axiosClient.patch(`/shops/admin/${id}/suspend`, { reason })
  },
  updateTax(id: number, body: { tax_code: string; tax_entity_type: string }) {
    return axiosClient.patch(`/shops/${id}/tax`, body)
  }
}

export default adminShopService
