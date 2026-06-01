import { useQuery } from '@tanstack/react-query'
import auditService, { AuditLogParams } from '../services/auditService'

const auditKeys = {
  all: ['admin', 'audit-logs'] as const,
  list: (params?: AuditLogParams) => [...auditKeys.all, 'list', params] as const
}

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditService.list(params),
    staleTime: 30 * 1000
  })
}
