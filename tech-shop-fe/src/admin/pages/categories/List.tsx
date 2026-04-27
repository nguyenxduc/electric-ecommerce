import { useState, useMemo } from 'react'
import { Edit3, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminCategories, useDeleteAdminCategory } from '../../hooks'
import ConfirmModal from '../../../client/components/common/ConfirmModal'

export default function AdminCategories() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(10)

  // Get parameters from URL
  const page = parseInt(searchParams.get('page') || '1', 10)
  const query = searchParams.get('q') || ''

  const { data, isLoading } = useAdminCategories({
    page,
    limit,
    q: query || undefined
  })
  const del = useDeleteAdminCategory()
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

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
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 text-sm w-56"
            placeholder="Search by ID or name"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <Link
            to="/admin/categories/new"
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            New Category
          </Link>
        </div>
      </div>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete category?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete === null) return
          del.mutate(pendingDelete, {
            onSuccess: () => toast.success('Category deleted'),
            onError: () => toast.error('Failed to delete category'),
            onSettled: () => setPendingDelete(null)
          })
        }}
      />
      <div>
        <div className="bg-white rounded border">
          {isLoading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Image</th>
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data.categories || []).map(c => (
                    <CategoryRow
                      key={c.id}
                      id={c.id}
                      name={c.name}
                      image_url={c.image_url}
                      onEdit={() => {
                        window.location.href = `/admin/categories/${c.id}`
                      }}
                      onDelete={() => setPendingDelete(c.id)}
                    />
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CategoryRow({
  id,
  name,
  image_url,
  onEdit,
  onDelete
}: {
  id: number
  name: string
  image_url?: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <tr className="border-t align-top">
      <td className="p-2 w-16">
        {image_url ? (
          <img
            src={image_url}
            className="h-10 w-10 object-cover rounded border"
          />
        ) : (
          <div className="h-10 w-10 rounded border bg-gray-100" />
        )}
      </td>
      <td className="p-2 w-16">{id}</td>
      <td className="p-2">
        <div className="font-medium">{name}</div>
      </td>
      <td className="p-2 w-56">
        <div className="flex items-center gap-2">
          <button title="Edit" className="text-blue-600" onClick={onEdit}>
            <Edit3 size={16} />
          </button>
          <button title="Delete" className="text-red-600" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}
