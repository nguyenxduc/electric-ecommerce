export type AdminCustomer = {
  id: number
  name?: string
  email?: string
  role?: string
  phone?: string
  address?: string
  created_at?: string
  loyalty_points?: number
  segment?: string | null
}

export type CustomerListResponse = {
  users: AdminCustomer[]
  pagination: {
    current_page: number
    per_page: number
    total_count: number
    total_pages: number
  }
}

export type CustomerResponse = AdminCustomer

export type UpdateCustomerRequest = Partial<{
  name: string
  role: string
  phone: string
  address: string
}>

export type UpdateCustomerTierRequest = {
  segment: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
}

export type UpdateCustomerPointsRequest = {
  loyalty_points: number
}
