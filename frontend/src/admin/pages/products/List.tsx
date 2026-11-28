import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useAdminProducts,
  useDeleteAdminProduct,
  useRestoreProduct,
  useTakedownProduct
} from '../../hooks'
import { Edit3, Trash2, MessageSquare, Ban, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from '../../../client/components/common/ConfirmModal'
import AdminPagination from '../../components/common/AdminPagination'
import ReasonModal from '../../components/common/ReasonModal'
import { useListQueryParams } from '../../hooks/useListQueryParams'
import adminShopService from '../../services/shopService'
import type { AdminProductListQuery } from '../../services/productService'
import type { AdminProduct } from '../../types'
import { apiErrorMessage } from '../../../lib/apiError'
import { formatPrice } from '../../../client/utils/formatMoney'

type StatusFilter = NonNullable<AdminProductListQuery['status']>

const STATUS_OPTIONS: { key: StatusFilter | ''; label: string }[] = [
  { key: '', label: 'All statuses' },
  { key: 'live', label: 'Live' },
  { key: 'hidden', label: 'Hidden by seller' },
  { key: 'taken_down', label: 'Taken down' }
]

// Ly do go hay gap, admin bam de dien nhanh
const TAKEDOWN_TEMPLATES = ['Prohibited item', 'Counterfeit', 'Misleading listing', 'Wrong category']

const statusOf = (p: AdminProduct) =>
  p.taken_down_at
    ? { label: 'Taken down', cls: 'bg-red-100 text-red-700' }
    : p.is_active === false
      ? { label: 'Hidden by seller', cls: 'bg-gray-200 text-gray-700' }
      : { label: 'Live', cls: 'bg-green-100 text-green-700' }

export default function AdminProductsList() {
  const [limit] = useState(10)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [takedownTarget, setTakedownTarget] = useState<AdminProduct | null>(null)
  const { page, q: query, setPage, setQ: setQuery, searchParams, setSearchParams } =
    useListQueryParams()
  // Bo loc song o URL (?status=, ?shop_id=) de o To-do tren dashboard link thang vao
  const statusParam = searchParams.get('status') || ''
  const status = STATUS_OPTIONS.some(o => o.key === statusParam) ? (statusParam as StatusFilter | '') : ''
  const shopId = searchParams.get('shop_id') || ''
  const setFilter = (key: 'status' | 'shop_id', v: string) => {
    const next = new URLSearchParams(searchParams)
    if (v) next.set(key, v)
    else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  const { data, isLoading } = useAdminProducts({
    page,
    limit,
    search: query || undefined,
    status: status || undefined,
    shop_id: shopId ? Number(shopId) : undefined
  })
  const { data: shopsData } = useQuery({
    queryKey: ['admin-shops', 'filter-options'],
    queryFn: () => adminShopService.list({ limit: 100 }),
    staleTime: 5 * 60 * 1000
  })
  const shops = shopsData?.data.data.shops ?? []
  const del = useDeleteAdminProduct()
  const takedown = useTakedownProduct()
  const restore = useRestoreProduct()

  const products = data?.data.products ?? []
  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Products</h1>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            className="border rounded px-3 py-2 text-sm w-full sm:w-56 min-w-0"
            placeholder="Search by ID or name"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter by status"
            className="border rounded px-2 py-2 text-sm flex-1 sm:flex-none min-w-0"
            value={status}
            onChange={e => setFilter('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by shop"
            className="border rounded px-2 py-2 text-sm flex-1 sm:flex-none min-w-0 sm:max-w-[12rem]"
            value={shopId}
            onChange={e => setFilter('shop_id', e.target.value)}
          >
            <option value="">All shops</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Link
            to="/admin/products/new"
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            New Product
          </Link>
        </div>
      </div>
      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete product?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete === null) return
          del.mutate(pendingDelete, {
            onSuccess: () => toast.success('Product deleted'),
            onError: () => toast.error('Failed to delete product'),
            onSettled: () => setPendingDelete(null)
          })
        }}
      />
      {takedownTarget && (
        <ReasonModal
          title={`Take down "${takedownTarget.name}"`}
          description="The product is hidden from buyers and the seller cannot turn it back on. The shop owner is notified with this reason."
          templates={TAKEDOWN_TEMPLATES}
          confirmText="Take down"
          pending={takedown.isPending}
          onClose={() => setTakedownTarget(null)}
          onConfirm={reason =>
            takedown.mutate(
              { id: takedownTarget.id, reason },
              {
                onSuccess: () => {
                  toast.success('Product taken down')
                  setTakedownTarget(null)
                },
                onError: err => toast.error(apiErrorMessage(err, 'Failed to take down product'))
              }
            )
          }
        />
      )}
      {isLoading ? (
        <div className="bg-white rounded border p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded border">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Image</th>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Shop</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Stock</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const st = statusOf(p)
                return (
                <tr key={p.id} className="border-t">
                  <td className="p-2">
                    {Array.isArray(p.img) && p.img[0] ? (
                      <img
                        src={p.img[0]}
                        className="h-10 w-10 object-cover rounded border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded border bg-gray-100" />
                    )}
                  </td>
                  <td className="p-2">{p.id}</td>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.shop?.name || '—'}</td>
                  <td className="p-2">{formatPrice(p.price)}</td>
                  <td className="p-2">
                    {Array.isArray(p.available_colors) &&
                    p.available_colors.length > 0
                      ? p.available_colors.reduce(
                          (sum, c) => sum + Number(c.quantity || 0),
                          0
                        )
                      : p.quantity ?? 0}
                  </td>
                  <td className="p-2">
                    <div className="min-w-[7rem]">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>
                      {p.takedown_reason && (
                        <div className="text-xs text-red-600 mt-0.5">{p.takedown_reason}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {p.taken_down_at ? (
                        <button
                          title="Restore"
                          aria-label={`Restore ${p.name}`}
                          className="text-green-700"
                          disabled={restore.isPending}
                          onClick={() =>
                            restore.mutate(p.id, {
                              onSuccess: () => toast.success('Product restored'),
                              onError: err => toast.error(apiErrorMessage(err, 'Failed to restore product'))
                            })
                          }
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : (
                        <button
                          title="Take down"
                          aria-label={`Take down ${p.name}`}
                          className="text-orange-600"
                          onClick={() => setTakedownTarget(p)}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      <Link
                        to={`/admin/products/${p.id}`}
                        title="Edit"
                        className="text-blue-600"
                      >
                        <Edit3 size={16} />
                      </Link>
                      <button
                        title="Delete"
                        className="text-red-600"
                        onClick={() => setPendingDelete(p.id)}
                        disabled={del.isPending}
                      >
                        <Trash2 size={16} />
                      </button>
                      <Link
                        to={`/admin/products/${p.id}/reviews`}
                        title="Reviews"
                        className="text-gray-600"
                      >
                        <MessageSquare size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table></div>

          <AdminPagination
            page={data?.data.pagination.current_page || page}
            totalPages={pages}
            onPageChange={setPage}
            totalItems={data?.data.pagination.total_count}
          />
        </div>
      )}
    </div>
  )
}
