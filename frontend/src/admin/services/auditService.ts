import axiosClient from '../../lib/axios'

export type AuditLog = {
  id: string | number
  user_id?: string | number | null
  action: string
  resource?: string | null
  resource_id?: string | number | null
  ip?: string | null
  user_agent?: string | null
  metadata?: Record<string, any> | null
  created_at: string
}

export type AuditLogListResponse = {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export type AuditLogParams = {
  page?: number
  limit?: number
  action?: string
  user_id?: string
  resource?: string
  resource_id?: string
  ip?: string
  date_from?: string
  date_to?: string
  q?: string
}

const auditService = {
  list(params?: AuditLogParams) {
    return axiosClient.get<{ success: boolean; data: AuditLogListResponse }>(
      '/audit-logs',
      { params }
    )
  }
}

export default auditService
