import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import { errMsg, fetchFraudFlags, fetchFraudStats, resolveFraudFlag } from '../../services/opsService'

const TYPES = ['COUPON_ABUSE', 'ORDER_RISK', 'SELF_DEALING', 'REVIEW_SUSPECT']
const STATUSES = ['open', 'confirmed', 'dismissed']
const STATUS_CLS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-red-100 text-red-700',
  dismissed: 'bg-gray-100 text-gray-600'
}

function Subject({ f }: { f: any }) {
  const i = f.subject_info
  if (!i)
    return (
      <span className="text-gray-400">
        {f.subject} #{f.subject_id}
      </span>
    )
  if (f.subject === 'order_group')
    return (
      <div>
        <div className="font-medium">{i.group_number}</div>
        <div className="text-xs text-gray-500">
          {Number(i.total_amount).toLocaleString('en-US')} / {i.payment_method} / {i.user?.email}
        </div>
      </div>
    )
  return (
    <div className="max-w-xs">
      <div className="truncate">{i.comment}</div>
      <div className="text-xs text-gray-500">
        {i.rating} stars / {i.product?.name} / {i.user?.email}
      </div>
    </div>
  )
}

export default function AdminFraudPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('open')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const stats = useQuery({ queryKey: ['admin', 'fraud', 'stats'], queryFn: fetchFraudStats })
  const flags = useQuery({
    queryKey: ['admin', 'fraud', 'flags', status, type, page],
    queryFn: () => fetchFraudFlags({ status: status || undefined, type: type || undefined, page, limit: 10 })
  })
  const resolve = useMutation({
    mutationFn: (v: { id: number | string; status: 'confirmed' | 'dismissed' }) => resolveFraudFlag(v.id, v.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'fraud'] })
      toast.success('Flag updated')
    },
    onError: e => toast.error(errMsg(e, 'Failed to update flag'))
  })

  const pg = flags.data?.pagination
  const sel = 'border rounded px-3 py-2 text-sm'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Fraud Flags</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-semibold">{stats.data?.total ?? 0}</div>
          <div className="text-xs text-gray-500">
            {STATUSES.map(s => `${s}: ${stats.data?.by_status?.[s] ?? 0}`).join(', ')}
          </div>
        </div>
        {TYPES.map(t => {
          const b = stats.data?.by_type?.[t] ?? {}
          return (
            <div key={t} className="bg-white border rounded-lg p-3">
              <div className="text-xs text-gray-500">{t}</div>
              <div className="text-2xl font-semibold">{b.open ?? 0}</div>
              <div className="text-xs text-gray-500">
                open, {b.confirmed ?? 0} confirmed, {b.dismissed ?? 0} dismissed
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className={sel}
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={e => {
            setType(e.target.value)
            setPage(1)
          }}
          className={sel}
        >
          <option value="">All types</option>
          {TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        {flags.isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Score</th>
                <th className="p-3">Reasons</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Created</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(flags.data?.data ?? []).map((f: any) => (
                <tr key={f.id} className="border-t align-top">
                  <td className="p-3">{f.type}</td>
                  <td className="p-3">{f.score}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(f.reasons ?? []).map((r: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <Subject f={f} />
                  </td>
                  <td className="p-3">{new Date(f.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs rounded ${STATUS_CLS[f.status] ?? ''}`}>{f.status}</span>
                  </td>
                  <td className="p-3">
                    {f.status === 'open' && (
                      <div className="flex gap-2">
                        <button
                          disabled={resolve.isPending}
                          onClick={() => resolve.mutate({ id: f.id, status: 'confirmed' })}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          Confirm
                        </button>
                        <button
                          disabled={resolve.isPending}
                          onClick={() => resolve.mutate({ id: f.id, status: 'dismissed' })}
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(flags.data?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No fraud flags
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {pg && (
          <AdminPagination page={page} totalPages={pg.total_pages} totalItems={pg.total_count} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
