import axiosClient from '../../lib/axios'

// ---- Shop vouchers ----
export type ShopCoupon = {
  id: number
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number | string
  min_order: number | string | null
  usage_limit: number | null
  used_count: number | null
  expires_at: string | null
  created_at: string
}

export const getMyShopCoupons = async (): Promise<ShopCoupon[]> => {
  const { data } = await axiosClient.get('/coupons/shop/mine/list')
  return data.coupons || []
}

export const createShopCoupon = async (payload: {
  code: string
  description?: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order?: number
  usage_limit?: number
  expires_at?: string
}) => {
  const { data } = await axiosClient.post('/coupons/shop', payload)
  return data
}

export const deleteShopCoupon = async (id: number) => {
  const { data } = await axiosClient.delete(`/coupons/shop/${id}`)
  return data
}

// ---- Return requests ----
export type ShopReturnRequest = {
  id: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  resolution_note: string | null
  created_at: string
  order: {
    id: number
    order_number: string | null
    total_amount: number | string | null
    created_at: string
  }
  user: { id: number; name: string | null; email: string | null }
}

export const getShopReturns = async (
  status?: string
): Promise<ShopReturnRequest[]> => {
  const { data } = await axiosClient.get('/returns/shop/mine', {
    params: { status }
  })
  return data.data?.requests || []
}

export const resolveReturn = async (
  id: number,
  action: 'approve' | 'reject',
  note?: string
) => {
  const { data } = await axiosClient.patch(`/returns/${id}/resolve`, {
    action,
    note
  })
  return data
}
