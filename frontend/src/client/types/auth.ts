export type AuthReq = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  address: string | null
  avatar: string | null
  loyalty_points?: number
  segment?: string | null
}

export type AuthRes = {
  success: boolean
  message: string
  data: {
    accessToken: string
    user: AuthUser
  }
}
