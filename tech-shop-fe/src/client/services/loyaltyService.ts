import axiosClient from '../../lib/axios'

export type LoyaltyTransaction = {
  id: string | number
  user_id: string | number
  order_id?: string | number | null
  points: number
  type: 'EARN' | 'REDEEM' | string
  description?: string | null
  created_at: string
}

export type LoyaltySummary = {
  user: {
    id: string
    name: string
    loyalty_points: number
    segment: string | null
  }
  tier?: {
    key: string
    label: string
    min: number
    max: number
    multiplier: number
    benefits: string[]
  }
  point_policy?: {
    unit_amount: number
    points_per_unit: number
    min_redeem_points: number
  }
  reward_vouchers?: Array<{
    id: string | number
    code: string
    description?: string | null
    discount_type: string
    discount_value: number
    min_order?: number | null
    expires_at?: string | null
    created_at: string
  }>
  transactions: LoyaltyTransaction[]
}

export const getLoyaltySummary = async (): Promise<LoyaltySummary> => {
  const { data } = await axiosClient.get<{ success: boolean; data: LoyaltySummary }>(
    '/loyalty/me'
  )
  return data.data
}

export const redeemPoints = async (payload: {
  points: number
  description?: string
}) => {
  const { data } = await axiosClient.post<{
    success: boolean
    message: string
    data: { loyalty_points: number }
  }>('/loyalty/redeem', payload)
  return data
}
