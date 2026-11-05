import axiosClient from '../../lib/axios'

export type RouteMetric = {
  route: string
  count: number
  p50: number
  p95: number
  c5xx: number
}

export type HealthSnapshot = {
  uptime_s: number
  routes: RouteMetric[]
  errors_5xx_total: number
  ai_calls_today: number
}

export const fetchHealth = async (): Promise<HealthSnapshot> => {
  const { data } = await axiosClient.get<{ success: boolean; data: HealthSnapshot }>(
    '/health'
  )
  return data.data
}
