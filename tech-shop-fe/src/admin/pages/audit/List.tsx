import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuditLogs } from '../../hooks/useAuditLogs'
import SkeletonTable from '../../components/common/SkeletonTable'
import type { AuditLog } from '../../services/auditService'

// ─── Action badge config ──────────────────────────────────────────────────────
const ACTION_STYLE: Record<string, { bg: string; text: string }> = {
  LOGIN:                 { bg: 'bg-blue-100',   text: 'text-blue-700' },
  LOGOUT:                { bg: 'bg-gray-100',    text: 'text-gray-600' },
  CHANGE_PASSWORD:       { bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  REGISTER:              { bg: 'bg-green-100',   text: 'text-green-700' },
  ORDER_CREATE:          { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  ORDER_STATUS_UPDATE:   { bg: 'bg-orange-100',  text: 'text-orange-700' },
  PRODUCT_CREATE:        { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  PRODUCT_UPDATE:        { bg: 'bg-purple-100',  text: 'text-purple-700' },
  PRODUCT_DELETE:        { bg: 'bg-red-100',     text: 'text-red-600' },
  COUPON_CREATE:         { bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  COUPON_DELETE:         { bg: 'bg-red-100',     text: 'text-red-600' },
}

const getActionStyle = (action: string) =>
  ACTION_STYLE[action] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }

// ─── All known action options for filter dropdown ─────────────────────────────
const ACTION_OPTIONS = [
  'LOGIN', 'LOGOUT', 'REGISTER', 'CHANGE_PASSWORD',
  'ORDER_CREATE', 'ORDER_STATUS_UPDATE',
  'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE',
  'COUPON_CREATE', 'COUPON_DELETE'
]

// ─── Expandable metadata cell ─────────────────────────────────────────────────
function MetaCell({ metadata }: { metadata?: Record<string, any> | null }) {
  const [open, setOpen] = useState(false)
  if (!metadata || Object.keys(metadata).length === 0)
    return <span className="text-gray-400 text-xs">—</span>

  return (
    <div className="max-w-xs">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? 'Hide' : 'View'}
      </button>
      {open && (
        <pre className="mt-1 text-xs bg-gray-50 border rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminAuditLogList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(50)

  const page     = parseInt(searchParams.get('page')    || '1', 10)
  const action   = searchParams.get('action')  || ''
  const user_id  = searchParams.get('user_id') || ''
  const resource = searchParams.get('resource') || ''
  const resource_id = searchParams.get('resource_id') || ''
  const ip = searchParams.get('ip') || ''
  const date_from = searchParams.get('date_from') || ''
  const date_to = searchParams.get('date_to') || ''
  const q = searchParams.get('q') || ''

  // local draft states for the filter fields (only committed on Search click)
  const [draftAction,  setDraftAction]  = useState(action)
  const [draftUserId,  setDraftUserId]  = useState(user_id)
  const [draftResource, setDraftResource] = useState(resource)
  const [draftResourceId, setDraftResourceId] = useState(resource_id)
  const [draftIp, setDraftIp] = useState(ip)
  const [draftDateFrom, setDraftDateFrom] = useState(date_from)
  const [draftDateTo, setDraftDateTo] = useState(date_to)
  const [draftQ, setDraftQ] = useState(q)

  const { data, isLoading, refetch, isFetching } = useAuditLogs({
    page,
    limit,
    action:  action  || undefined,
    user_id: user_id || undefined,
    resource: resource || undefined,
    resource_id: resource_id || undefined,
    ip: ip || undefined,
    date_from: date_from || undefined,
    date_to: date_to || undefined,
    q: q || undefined
  })

  const logs       = data?.data?.data?.logs ?? []
  const pagination = data?.data?.data?.pagination
  const pages      = useMemo(() => Math.max(1, pagination?.pages ?? 1), [pagination])

  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams)
    p.set('page', String(n))
    setSearchParams(p)
  }

  const applyFilters = () => {
    const p = new URLSearchParams()
    if (draftAction)  p.set('action',  draftAction)
    if (draftUserId)  p.set('user_id', draftUserId)
    if (draftResource) p.set('resource', draftResource)
    if (draftResourceId) p.set('resource_id', draftResourceId)
    if (draftIp) p.set('ip', draftIp)
    if (draftDateFrom) p.set('date_from', draftDateFrom)
    if (draftDateTo) p.set('date_to', draftDateTo)
    if (draftQ) p.set('q', draftQ)
    p.set('page', '1')
    setSearchParams(p)
  }

  const clearFilters = () => {
    setDraftAction('')
    setDraftUserId('')
    setDraftResource('')
    setDraftResourceId('')
    setDraftIp('')
    setDraftDateFrom('')
    setDraftDateTo('')
    setDraftQ('')
    setSearchParams(new URLSearchParams())
  }

  const hasFilter = !!(action || user_id || resource || resource_id || ip || date_from || date_to || q)

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-gray-600" />
          <h1 className="text-xl font-semibold">Audit Log</h1>
          {pagination && (
            <span className="text-sm text-gray-400 ml-1">
              ({pagination.total.toLocaleString()} records)
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded border p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Action filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Action</label>
            <select
              value={draftAction}
              onChange={e => setDraftAction(e.target.value)}
              className="border rounded px-3 py-2 text-sm min-w-[180px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">— All actions —</option>
              {ACTION_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* User ID filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">User ID</label>
            <input
              type="text"
              value={draftUserId}
              onChange={e => setDraftUserId(e.target.value)}
              placeholder="e.g. 42"
              className="border rounded px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Resource</label>
            <input
              type="text"
              value={draftResource}
              onChange={e => setDraftResource(e.target.value)}
              placeholder="order, product…"
              className="border rounded px-3 py-2 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Resource ID</label>
            <input
              type="text"
              value={draftResourceId}
              onChange={e => setDraftResourceId(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">IP</label>
            <input
              type="text"
              value={draftIp}
              onChange={e => setDraftIp(e.target.value)}
              placeholder="partial"
              className="border rounded px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={draftDateFrom}
              onChange={e => setDraftDateFrom(e.target.value)}
              className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={draftDateTo}
              onChange={e => setDraftDateTo(e.target.value)}
              className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Tìm nhanh</label>
            <input
              type="text"
              value={draftQ}
              onChange={e => setDraftQ(e.target.value)}
              placeholder="action / resource"
              className="border rounded px-3 py-2 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            <button
              onClick={applyFilters}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              <Search size={14} />
              Search
            </button>
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Active filter tags */}
        {hasFilter && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {action && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActionStyle(action).bg} ${getActionStyle(action).text}`}>
                Action: {action}
              </span>
            )}
            {user_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                User ID: {user_id}
              </span>
            )}
            {resource && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                Resource: {resource}
              </span>
            )}
            {resource_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Res. ID: {resource_id}
              </span>
            )}
            {ip && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                IP: {ip}
              </span>
            )}
            {(date_from || date_to) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800">
                {date_from || '…'} → {date_to || '…'}
              </span>
            )}
            {q && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                q: {q}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded border overflow-x-auto">
        {isLoading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ShieldAlert className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No audit logs found.</p>
            {hasFilter && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs text-blue-500 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">ID</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Action</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Resource</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">User ID</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">IP</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Metadata</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: AuditLog, i: number) => {
                  const style = getActionStyle(log.action)
                  return (
                    <tr
                      key={String(log.id ?? i)}
                      className="border-t hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 text-gray-400 text-xs font-mono">
                        #{String(log.id)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.resource ? (
                          <span className="text-gray-700">
                            {log.resource}
                            {log.resource_id && (
                              <span className="text-gray-400 ml-1">
                                #{String(log.resource_id)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 font-mono text-xs">
                        {log.user_id ? String(log.user_id) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="p-3 text-gray-500 text-xs font-mono whitespace-nowrap">
                        {log.ip || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="p-3">
                        <MetaCell metadata={log.metadata} />
                      </td>
                      <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-3 border-t text-sm">
              <span className="text-gray-400 text-xs">
                Page {pagination?.page ?? 1} of {pages} — {pagination?.total.toLocaleString()} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="px-3 py-1.5 border rounded disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  const n = page <= 4 ? i + 1
                    : page >= pages - 3 ? pages - 6 + i
                    : page - 3 + i
                  if (n < 1 || n > pages) return null
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`px-3 py-1.5 rounded border ${
                        n === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {n}
                    </button>
                  )
                })}
                <button
                  className="px-3 py-1.5 border rounded disabled:opacity-40"
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
