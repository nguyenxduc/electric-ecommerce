import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, RefreshCw } from 'lucide-react'
import { fetchHealth } from '../../services/healthService'
import SkeletonTable from '../../components/common/SkeletonTable'

// Cung nguong voi METRICS_P95_ALERT_MS mac dinh o backend (metrics.middleware.js).
const P95_TARGET_MS = 500

const formatUptime = (s: number) => {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`
}

export default function AdminHealthPage() {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } =
    useQuery({
      queryKey: ['admin', 'health'],
      queryFn: fetchHealth,
      refetchInterval: 15000
    })

  const routes = useMemo(
    () => [...(data?.routes ?? [])].sort((a, b) => b.p95 - a.p95),
    [data]
  )
  const slowCount = routes.filter(r => r.p95 > P95_TARGET_MS).length

  const cards = [
    { label: 'Uptime', value: data ? formatUptime(data.uptime_s) : '-' },
    {
      label: '5xx errors',
      value: data?.errors_5xx_total ?? '-',
      bad: (data?.errors_5xx_total ?? 0) > 0
    },
    {
      label: `Routes p95 > ${P95_TARGET_MS}ms`,
      value: data ? `${slowCount} / ${routes.length}` : '-',
      bad: slowCount > 0
    },
    { label: 'Gemini calls today', value: data?.ai_calls_today ?? '-' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-semibold text-gray-800">System health</h1>
          <span className="text-sm text-gray-500">
            In-memory since last backend restart, refreshes every 15s
          </span>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-gray-500">
              Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1 px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {isError && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">
          Could not load /api/health.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div
              className={`mt-1 text-2xl font-semibold ${
                c.bad ? 'text-red-600' : 'text-gray-800'
              }`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        {isLoading ? (
          <SkeletonTable />
        ) : isError ? null : routes.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No requests recorded yet.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Route</th>
                <th className="text-right px-4 py-2 font-medium">Requests</th>
                <th className="text-right px-4 py-2 font-medium">p50 (ms)</th>
                <th className="text-right px-4 py-2 font-medium">p95 (ms)</th>
                <th className="text-right px-4 py-2 font-medium">5xx</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(r => (
                <tr key={r.route} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{r.route}</td>
                  <td className="px-4 py-2 text-right">{r.count}</td>
                  <td className="px-4 py-2 text-right">{r.p50}</td>
                  <td
                    className={`px-4 py-2 text-right ${
                      r.p95 > P95_TARGET_MS ? 'text-red-600 font-semibold' : ''
                    }`}
                  >
                    {r.p95}
                  </td>
                  <td
                    className={`px-4 py-2 text-right ${
                      r.c5xx > 0 ? 'text-red-600 font-semibold' : ''
                    }`}
                  >
                    {r.c5xx}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
