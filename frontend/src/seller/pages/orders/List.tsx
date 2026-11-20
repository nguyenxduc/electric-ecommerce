import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useMyShopOrders,
  useMyShopOrderStats,
  useUpdateShopOrderStatus
} from '../../../admin/hooks/useOrders'
import SkeletonTable from '../../../admin/components/common/SkeletonTable'
import AdminPagination from '../../../admin/components/common/AdminPagination'
import { formatUsd } from '../../../client/utils/formatMoney'

export default function SellerOrdersList() {
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  // Tab trang thai song o URL (?status=): link tu To-do loc san, refresh giu dung tab
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || undefined
  const setStatus = (v?: string) =>
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        if (v) next.set('status', v)
        else next.delete('status')
        return next
      },
      { replace: true }
    )
  const [q, setQ] = useState('')
  const { data, isLoading, error } = useMyShopOrders({
    page,
    limit,
    status,
    q: q || undefined
  })
  const { data: statsData, isLoading: statsLoading } = useMyShopOrderStats()
  const statusMut = useUpdateShopOrderStatus()
  const confirmOrder = (id: number) =>
    statusMut.mutate(
      { id, status: 'processing' },
      {
        onSuccess: () => toast.success('Order confirmed - ready to ship'),
        onError: (e: Error & { response?: { data?: { message?: string } } }) =>
          toast.error(e.response?.data?.message || 'Failed to confirm order')
      }
    )
  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  const stats = statsData?.data

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Orders</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          title="Total Orders"
          value={statsLoading ? '...' : String(stats?.total_orders || 0)}
        />
        <KpiCard
          title="Pending Orders"
          value={statsLoading ? '...' : String(stats?.pending_orders || 0)}
        />
        <KpiCard
          title="Total Revenue"
          value={statsLoading ? '...' : formatUsd(stats?.revenue || 0)}
        />
      </div>

      <div className="bg-white rounded border">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { label: 'All orders', value: undefined },
              { label: 'Pending', value: 'pending' },
              { label: 'Processing', value: 'processing' },
              { label: 'Shipped', value: 'shipped' },
              { label: 'Delivered', value: 'delivered' },
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
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            className="border rounded px-3 py-1.5 text-sm w-full sm:w-56"
            placeholder="Search by order number"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setPage(1)}
          />
        </div>

        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : error ? (
          <div className="p-6 text-red-700 bg-red-50 border-b border-red-200">
            Failed to load orders. Please retry.
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="text-left p-2">No.</th>
                <th className="text-left p-2">Order</th>
                <th className="text-left p-2">Buyer</th>
                <th className="text-left p-2">Products</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No orders yet.
                  </td>
                </tr>
              )}
              {data?.data.orders.map((o, idx) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">{(page - 1) * limit + idx + 1}</td>
                  <td className="p-2">
                    <Link
                      to={`/seller/orders/${o.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {o.order_number
                        ? `#${o.order_number}`
                        : `#${String(o.id).padStart(6, '0')}`}
                    </Link>
                  </td>
                  <td className="p-2">{o.user?.name || '—'}</td>
                  <td className="p-2">
                    {/* Anh + ten san pham dau tien, nhu danh sach don cua Seller Center */}
                    {o.order_items?.[0] ? (
                      <div className="flex items-center gap-2 min-w-[180px]">
                        {o.order_items[0].product?.img?.[0] && (
                          <img
                            src={o.order_items[0].product.img[0]}
                            alt=""
                            className="w-9 h-9 rounded border object-contain bg-white shrink-0"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate max-w-[180px]">
                            {o.order_items[0].product?.name || 'Product'}
                          </span>
                          {o.order_items.length > 1 && (
                            <span className="text-xs text-gray-500">+{o.order_items.length - 1} more</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-2">
                    {o.created_at
                      ? new Date(o.created_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-2 font-semibold">
                    {formatUsd(o.total_amount)}
                  </td>
                  <td className="p-2">
                    <Link
                      to={`/seller/orders/${o.id}`}
                      className={statusClass(o.status)}
                    >
                      {o.status}
                    </Link>
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    {o.status === 'pending' ? (
                      <button
                        onClick={() => confirmOrder(o.id)}
                        disabled={statusMut.isPending}
                        className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    ) : (
                      <Link
                        to={`/seller/orders/${o.id}`}
                        className="px-3 py-1 text-xs font-medium rounded border hover:bg-gray-50"
                      >
                        {o.status === 'processing' ? 'Arrange shipment' : 'View'}
                      </Link>
                    )}
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

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
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

