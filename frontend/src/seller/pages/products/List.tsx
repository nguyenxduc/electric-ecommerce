import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { Edit3, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useMyShopProducts,
  useDeleteAdminProduct,
  useSetProductVisibility
} from '../../../admin/hooks/useProducts'
import { AdminProduct } from '../../../admin/types'
import ConfirmModal from '../../../client/components/common/ConfirmModal'
import AdminPagination from '../../../admin/components/common/AdminPagination'
import { useListQueryParams } from '../../../admin/hooks/useListQueryParams'
import { apiErrorMessage } from '../../../lib/apiError'

const TABS = [
  { key: '', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'hidden', label: 'Hidden' }
] as const

const stockOf = (p: AdminProduct) =>
  Array.isArray(p.available_colors) && p.available_colors.length > 0
    ? p.available_colors.reduce((sum, c) => sum + Number(c.quantity || 0), 0)
    : p.quantity ?? 0

// Cung nguong LOW_STOCK_THRESHOLD (5) voi o "Low stock" tren dashboard
function StockBadge({ stock }: { stock: number }) {
  return stock <= 5 ? (
    <span className="inline-flex items-center gap-1 font-medium text-red-600">
      {stock}
      <span className="text-[10px] uppercase bg-red-50 border border-red-200 rounded px-1">
        {stock === 0 ? 'Out' : 'Low'}
      </span>
    </span>
  ) : (
    <span>{stock}</span>
  )
}

export default function SellerProductsList() {
  const [limit] = useState(10)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const { page, q: query, setPage, setQ: setQuery, searchParams, setSearchParams } = useListQueryParams()
  // ?stock=low: o "Low stock" tren dashboard mo thang danh sach nay
  const lowOnly = searchParams.get('stock') === 'low'
  const statusParam = searchParams.get('status')
  const status = statusParam === 'live' || statusParam === 'hidden' ? statusParam : undefined
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  const { data, isLoading } = useMyShopProducts({
    page,
    limit,
    search: query || undefined,
    stock: lowOnly ? 'low' : undefined,
    status
  })
  const del = useDeleteAdminProduct()
  const visibility = useSetProductVisibility()

  const products = data?.data.products ?? []
  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  const toggleVisible = (p: AdminProduct) => {
    const live = p.is_active !== false
    visibility.mutate(
      { id: p.id, is_active: !live },
      {
        onSuccess: () => toast.success(live ? 'Product hidden from buyers' : 'Product is live'),
        onError: err => toast.error(apiErrorMessage(err, 'Failed to update visibility'))
      }
    )
  }

  const visibilitySwitch = (p: AdminProduct) => {
    const live = p.is_active !== false
    return (
      <button
        type="button"
        role="switch"
        aria-checked={live}
        aria-label={`${live ? 'Hide' : 'Show'} ${p.name}`}
        onClick={() => toggleVisible(p)}
        disabled={visibility.isPending}
        className="inline-flex items-center gap-2 text-xs"
      >
        <span
          className={`relative h-5 w-9 rounded-full transition-colors ${
            live ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              live ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </span>
        <span className={live ? 'text-green-700' : 'text-gray-500'}>{live ? 'Live' : 'Hidden'}</span>
      </button>
    )
  }

  const actions = (p: AdminProduct) => (
    <div className="flex items-center gap-3">
      <Link to={`/seller/products/${p.id}`} title="Edit" aria-label="Edit" className="text-blue-600 p-1">
        <Edit3 size={16} />
      </Link>
      <button
        title="Delete"
        aria-label="Delete"
        className="text-red-600 p-1"
        onClick={() => setPendingDelete(p.id)}
        disabled={del.isPending}
      >
        <Trash2 size={16} />
      </button>
    </div>
  )

  const thumb = (p: AdminProduct, size: string) =>
    Array.isArray(p.img) && p.img[0] ? (
      <img src={p.img[0]} alt="" className={`${size} object-cover rounded border shrink-0`} />
    ) : (
      <div className={`${size} rounded border bg-gray-100 shrink-0`} />
    )

  const empty = (
    <>
      No products yet.{' '}
      <Link to="/seller/products/new" className="text-blue-600 hover:underline">
        Add your first product
      </Link>
    </>
  )

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h1 className="text-xl font-semibold">My Products</h1>
        <Link
          to="/seller/products/new"
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm whitespace-nowrap"
        >
          New Product
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded border overflow-hidden text-sm" role="tablist">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={(status ?? '') === t.key}
              onClick={() => setParam('status', t.key || null)}
              className={`px-3 py-2 ${
                (status ?? '') === t.key ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setParam('stock', lowOnly ? null : 'low')}
          aria-pressed={lowOnly}
          className={`px-3 py-2 text-sm rounded border whitespace-nowrap ${
            lowOnly ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white hover:bg-gray-50'
          }`}
        >
          Low stock only
        </button>
        <input
          className="border rounded px-3 py-2 text-sm flex-1 min-w-0 basis-40 md:flex-none md:w-56"
          placeholder="Search by name"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
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
            onError: err => toast.error(apiErrorMessage(err, 'Failed to delete product')),
            onSettled: () => setPendingDelete(null)
          })
        }}
      />
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
          {/* Duoi md: the san pham thay cho bang de khong tran ngang */}
          <ul className="md:hidden divide-y" data-testid="product-cards">
            {products.length === 0 && <li className="p-6 text-center text-gray-500 text-sm">{empty}</li>}
            {products.map(p => (
              <li key={p.id} className="p-3 flex gap-3">
                {thumb(p, 'h-16 w-16')}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm line-clamp-2 break-words">{p.name}</div>
                  <div className="text-sm text-gray-700 mt-0.5">${p.price}</div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    Stock: <StockBadge stock={stockOf(p)} />
                    <span>· Sold {p.sold ?? 0}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {visibilitySwitch(p)}
                    {actions(p)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Image</th>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Stock</th>
                  <th className="text-left p-2">Sold</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">
                      {empty}
                    </td>
                  </tr>
                )}
                {products.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">
                      {thumb(p, 'h-10 w-10')}
                    </td>
                    <td className="p-2">{p.id}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">${p.price}</td>
                    <td className="p-2">
                      <StockBadge stock={stockOf(p)} />
                    </td>
                    <td className="p-2">{p.sold ?? 0}</td>
                    <td className="p-2">
                      {visibilitySwitch(p)}
                    </td>
                    <td className="p-2">
                      {actions(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
