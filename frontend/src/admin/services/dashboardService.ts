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
  followers?: { total: number; formatted: string }
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

export type BehaviorAnalytics = {
  window: {
    days: number
    since: string
    until: string
  }
  visitors: number
  returning: number
  returningRate: number
  funnel: {
    viewers: number
    carters: number
    loggedInCarters: number
    buyers: number
    viewToCartRate: number
    cartToOrderRate: number
  }
  caveats: {
    timezone: string
    rollupLag: string
    anonymousExcluded: string
    identityNote: string
  }
}

export type DashboardStatsResponse = {
  success: boolean
  data: DashboardStats
}

export type TopProductsResponse = {
  success: boolean
  data: TopProduct[]
}

export type BehaviorAnalyticsResponse = {
  success: boolean
  data: BehaviorAnalytics
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

export const getBehaviorAnalytics = async (days?: number): Promise<BehaviorAnalyticsResponse> => {
  const { data } = await axiosClient.get<BehaviorAnalyticsResponse>('/dashboard/behavior', {
    params: { days }
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


// Khoi "To-do" dau dashboard: so viec can xu ly
export type ShopTodo = {
  to_confirm: number
  to_ship: number
  shipping: number
  returns_pending: number
  unread_messages: number
  low_stock: number
  unreplied_reviews: number
}
export type AdminTodo = {
  shops_pending: number
  unread_support: number
  fraud_open: number
  products_taken_down: number
}

export const getShopTodo = async (): Promise<ShopTodo> =>
  (await axiosClient.get('/dashboard/shop/todo')).data.data

export const getAdminTodo = async (): Promise<AdminTodo> =>
  (await axiosClient.get('/dashboard/todo')).data.data

// Trang "My income" cua seller: da giao / dang cho / phi san trong khoang ngay
export type ShopFinance = {
  rate: number
  released: { amount: number; count: number }
  pending: { amount: number; count: number }
  fee: number
  net: number
  orders: {
    id: number
    order_number: string | null
    created_at: string
    status: string
    gross: number
    fee: number
    net: number
  }[]
}

export const getShopFinance = async (params: { from?: string; to?: string }): Promise<ShopFinance> =>
  (await axiosClient.get('/dashboard/shop/finance', { params })).data.data
