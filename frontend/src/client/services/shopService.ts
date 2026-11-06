import axiosClient from '../../lib/axios'

export type Shop = {
  id: number
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  status: 'pending' | 'active' | 'rejected' | 'suspended'
  rejection_reason?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  address: string | null
  shipping_fee_override?: number | string | null
  free_shipping_threshold_override?: number | string | null
  created_at: string
  is_owner?: boolean
  rating?: number | null
  review_count?: number
  _count?: { products: number }
}

export type ShopApplication = {
  name: string
  description?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  shipping_fee_override?: number | string | null
  free_shipping_threshold_override?: number | string | null
}

// Public shop profile (active shops; owners/admins can preview any status)
export const getShopBySlug = async (slug: string): Promise<Shop> => {
  const res = await axiosClient.get(`/shops/${encodeURIComponent(slug)}`)
  return res.data.data
}

// Public product listing of a shop (same shape as the main product listing)
export const getShopProducts = async (
  slug: string,
  params?: { page?: number; limit?: number; sort?: string; search?: string }
) => {
  const res = await axiosClient.get(
    `/shops/${encodeURIComponent(slug)}/products`,
    { params }
  )
  return res.data
}

// The caller's own shop (any status); 404 when none exists
export const getMyShop = async (): Promise<Shop | null> => {
  try {
    const res = await axiosClient.get('/shops/me')
    return res.data.data
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export const applyForShop = async (payload: ShopApplication): Promise<Shop> => {
  const res = await axiosClient.post('/shops/apply', payload)
  return res.data.data
}

// Owner edits shop profile; resubmits automatically when status is rejected
export const updateMyShop = async (
  payload: Partial<ShopApplication>
): Promise<Shop> => {
  const res = await axiosClient.patch('/shops/me', payload)
  return res.data.data
}

export type ShopVoucher = {
  id: number
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number | string
  min_order: number | string | null
  expires_at: string | null
}

// Collectible vouchers displayed on the shop's public page
export const getShopVouchers = async (slug: string): Promise<ShopVoucher[]> => {
  const res = await axiosClient.get(
    `/coupons/shop/${encodeURIComponent(slug)}`
  )
  return res.data.data?.coupons || []
}
