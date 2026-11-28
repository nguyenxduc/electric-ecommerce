import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import adminShopService from '../../services/shopService'
import { useAdminOrders, useAdminOrderStats } from '../../hooks'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import { fmtDate } from '../../utils/date'
import { formatPrice } from '../../../client/utils/formatMoney'

export default function AdminOrdersList() {
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [shopId, setShopId] = useState('')
  const { data, isLoading, error } = useAdminOrders({
    page,
    limit,
    status,
    q: q || undefined,
    from: from || undefined,
    to: to || undefined,
    shop_id: shopId ? Number(shopId) : undefined
  })
  // Danh sach shop cho bo loc
  const { data: shopsData } = useQuery({
    queryKey: ['admin', 'shops', 'filter-options'],
    queryFn: () => adminShopService.list({ limit: 100 })
  })
  const shops = shopsData?.data.data.shops ?? []
  const filtered = !!(q || status || from || to || shopId)
  const clearFilters = () => {
    setQ('')
    setStatus(undefined)
    setFrom('')
    setTo('')
    setShopId('')
    setPage(1)
  }
  const { data: statsData, isLoading: statsLoading } = useAdminOrderStats()
  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  const stats = statsData?.data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard
          title="Total Orders"
          value={statsLoading ? '...' : formatNumber(stats?.total_orders || 0)}
          delta=""
        />
        <KpiCard
          title="New Orders"
          value={
            statsLoading ? '...' : formatNumber(stats?.pending_orders || 0)
          }
          delta=""
        />
        <KpiCard
          title="Total Revenue"
          value={
            statsLoading ? '...' : formatPrice(Number(stats?.revenue || 0))
          }
          delta=""
        />
        <KpiCard
          title="Recent Orders"
          value={
            statsLoading
              ? '...'
              : formatNumber(stats?.recent_orders?.length || 0)
          }
          delta=""
        />
      </div>

      <div className="bg-white rounded border">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b">
          <div className="flex gap-2 overflow-x-auto max-w-full">
            {[
              { label: 'All order', value: undefined },
              { label: 'Pending', value: 'pending' },
              { label: 'Processing', value: 'processing' },
              { label: 'Shipped', value: 'shipped' },
              { label: 'Completed', value: 'delivered' },
              { label: 'Returned', value: 'returned' },
              { label: 'Cancelled', value: 'cancelled' }
            ].map(t => (
              <button
                key={t.label}
                onClick={() => {
                  setStatus(t.value)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded text-sm ${
                  status === t.value || (!status && t.value === undefined)
                    ? 'bg-green-100 text-green-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <input
              className="border rounded px-3 py-1.5 text-sm w-full sm:w-72"
              placeholder="Search order no., buyer, phone, tracking"
              value={q}
              onChange={e => {
                setQ(e.target.value)
                setPage(1)
              }}
              onKeyDown={e => e.key === 'Enter' && setPage(1)}
            />
            <button className="p-2 border rounded" onClick={() => setPage(1)} aria-label="Search">
              ⟳
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b text-sm">
          <label className="flex items-center gap-1">
            From
            <input
              type="date"
              aria-label="From date"
              className="border rounded px-2 py-1"
              value={from}
              onChange={e => {
                setFrom(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="flex items-center gap-1">
            To
            <input
              type="date"
              aria-label="To date"
              className="border rounded px-2 py-1"
              value={to}
              onChange={e => {
                setTo(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <select
            aria-label="Shop"
            className="border rounded px-2 py-1 max-w-full"
            value={shopId}
            onChange={e => {
              setShopId(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All shops</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {filtered && (
            <button className="px-2 py-1 rounded border hover:bg-gray-50" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : error ? (
          <div className="p-6 text-red-700 bg-red-50 border-b border-red-200">
            Failed to load orders. Please retry.
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="text-left p-2">No.</th>
                <th className="text-left p-2">Order</th>
                <th className="text-left p-2">Shop</th>
                <th className="text-left p-2">Items</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Payment</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    {filtered ? 'No orders match your search.' : 'No orders yet.'}
                  </td>
                </tr>
              )}
              {data?.data.orders.map((o, idx) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">
                    <div className="flex flex-col">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {o.order_number
                          ? `#${o.order_number}`
                          : `#${String(o.id).padStart(6, '0')}`}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {o.user?.name || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="p-2">{o.shop?.name || '—'}</td>
                  <td className="p-2">{o.order_items?.length || 0}</td>
                  <td className="p-2">
                    {o.created_at
                      ? fmtDate(o.created_at)
                      : '-'}
                  </td>
                  <td className="p-2 font-semibold">
                    {formatPrice(Number(o.total_amount))}
                  </td>
                  <td className="p-2 flex items-center gap-2">
                    {getPaymentStatus(o.payment_method)}
                  </td>
                  <td className="p-2">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className={statusClass(o.status)}
                    >
                      {o.status}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        <AdminPagination
          page={data?.data.pagination.current_page || page}
          totalPages={pages}
          onPageChange={setPage}
          totalItems={data?.data.pagination.total_count}
        />
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  delta
}: {
  title: string
  value: string
  delta: string
}) {
  const positive = !delta.startsWith('-')
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <span
          className={`text-xs ${positive ? 'text-green-600' : 'text-red-600'}`}
        >
          {delta}
        </span>
      </div>
    </div>
  )
}

function statusClass(status: string) {
  switch (status) {
    case 'delivered':
      return 'px-2 py-1 rounded bg-green-100 text-green-700'
    case 'pending':
      return 'px-2 py-1 rounded bg-yellow-100 text-yellow-700'
    case 'processing':
      return 'px-2 py-1 rounded bg-purple-100 text-purple-700'
    case 'shipped':
      return 'px-2 py-1 rounded bg-blue-100 text-blue-700'
    case 'cancelled':
      return 'px-2 py-1 rounded bg-red-100 text-red-700'
    default:
      return 'px-2 py-1 rounded bg-gray-100 text-gray-700'
  }
}

function getPaymentStatus(paymentMethod: string | null | undefined) {
  if (!paymentMethod) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Unpaid
      </span>
    )
  }

  const method = paymentMethod.toLowerCase()
  if (method === 'cod') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-700">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        COD
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Paid
    </span>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

