import axiosClient from '../../lib/axios'

export type DashboardStats = {
  sales: {
    current: number
    previous: number
    delta: string
    formatted: string
    formattedPrev: string
  }
  orders: {
    current: number
    previous: number
    delta: string
    formatted: string
    formattedPrev: string
  }
  pending: {
    current: number
    previous: number
    delta: string
    formatted: string
  }
  cancelled: {
    current: number
    previous: number
    delta: string
    formatted: string
  }
  customers: {
    total: number
    formatted: string
  }
  products: {
    total: number
    inStock: number
    outOfStock: number
    formatted: {
      total: string
      inStock: string
      outOfStock: string
    }
  }
  revenue: {
    total: number
    formatted: string
  }
  // Present on the seller (shop-scoped) stats only
  commission?: {
    rate: number
    ratePercent: string
    fee: number
    netRevenue: number
    formatted: {
      fee: string
      netRevenue: string
    }
  }
}

export type TopProduct = {
  id: string
  name: string
  sku: string
  price: string
  priceValue: number
  sold: number
  image: string | null
}

export type DashboardStatsResponse = {
  success: boolean
  data: DashboardStats
}

export type TopProductsResponse = {
  success: boolean
  data: TopProduct[]
}

export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const { data } = await axiosClient.get<DashboardStatsResponse>('/dashboard/stats')
  return data
}

export const getTopProducts = async (limit?: number): Promise<TopProductsResponse> => {
  const { data } = await axiosClient.get<TopProductsResponse>('/dashboard/top-products', {
    params: { limit }
  })
  return data
}

// Seller dashboard variants (scoped to the caller's own shop)
export const getShopDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const { data } = await axiosClient.get<DashboardStatsResponse>('/dashboard/shop/stats')
  return data
}

export const getShopTopProducts = async (limit?: number): Promise<TopProductsResponse> => {
  const { data } = await axiosClient.get<TopProductsResponse>('/dashboard/shop/top-products', {
    params: { limit }
  })
  return data
}

