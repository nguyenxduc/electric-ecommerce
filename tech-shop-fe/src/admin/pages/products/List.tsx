import { Link, useSearchParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useAdminProducts, useDeleteAdminProduct } from '../../hooks'
import { Edit3, Trash2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from '../../../client/components/common/ConfirmModal'

export default function AdminProductsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(10)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  // Get parameters from URL
  const page = parseInt(searchParams.get('page') || '1', 10)
  const query = searchParams.get('q') || ''

  const { data, isLoading } = useAdminProducts({
    page,
    limit,
    search: query || undefined
  })
  const del = useDeleteAdminProduct()

  const products = data?.data.products ?? []
  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  // Update URL when page changes
  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    setSearchParams(params)
  }

  // Update URL when query changes
  const setQuery = (newQuery: string) => {
    const params = new URLSearchParams(searchParams)
    if (newQuery) {
      params.set('q', newQuery)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // Reset to first page when searching
    setSearchParams(params)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Products</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 text-sm w-56"
            placeholder="Search by ID or name"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
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
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Image</th>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Stock</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
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
                  <td className="p-2">${p.price}</td>
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
                    <div className="flex items-center gap-2">
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
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between p-3 border-t text-sm">
            <button
              className="px-3 py-1.5 border rounded"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </button>
            <div className="space-x-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`px-3 py-1.5 rounded border ${
                    n === (data?.data.pagination.current_page || 1)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : ''
                  }`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              className="px-3 py-1.5 border rounded"
              disabled={page >= pages}
              onClick={() => setPage(Math.min(pages, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
