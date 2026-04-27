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
