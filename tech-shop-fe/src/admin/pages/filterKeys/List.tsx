import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Edit, Trash2, Key } from 'lucide-react'
import { toast } from 'sonner'
import { useFilterKeys, useDeleteFilterKey } from '../../hooks/useFilterKeys'
import ConfirmModal from '../../components/ConfirmModal'

export default function FilterKeysList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(10)

  // Get parameters from URL
  const page = parseInt(searchParams.get('page') || '1', 10)
  const query = searchParams.get('q') || ''

  const { data, isLoading } = useFilterKeys({
    page,
    limit,
    q: query || undefined
  })
  const deleteFilterKey = useDeleteFilterKey()
  const [showDeleteModal, setShowDeleteModal] = useState<{
    id: string
    name: string
  } | null>(null)

  const pages = useMemo(
    () => Math.max(1, data?.pagination?.total_pages || 1),
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

  const filterKeys = data?.data || []

  const handleDelete = async () => {
    if (!showDeleteModal) return

    try {
      await deleteFilterKey.mutateAsync(showDeleteModal.id)
      toast.success('Filter key deleted successfully')
      setShowDeleteModal(null)
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to delete filter key'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={!!showDeleteModal}
        title="Delete Filter Key"
        description={
          showDeleteModal
            ? `Are you sure you want to delete "${showDeleteModal.name}"? This will also delete all associated filter options.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(null)}
        confirmClassName="bg-red-600 hover:bg-red-700"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filter Keys</h1>
          <p className="text-gray-600">Manage filter key definitions</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 text-sm w-56"
            placeholder="Search by key or label"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <Link
            to="/admin/filter-keys/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Filter Key
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Options
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filterKeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No filter keys found</p>
                    <p className="text-sm">
                      Create your first filter key to get started
                    </p>
                  </td>
                </tr>
              ) : (
                filterKeys.map(filterKey => (
                  <tr key={filterKey.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {filterKey.key}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {filterKey.label}
                        </div>
                        {filterKey.description && (
                          <div className="text-sm text-gray-500">
                            {filterKey.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {filterKey.data_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {filterKey.options_count || 0} options
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          filterKey.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {filterKey.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/filter-keys/${filterKey.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() =>
                            setShowDeleteModal({
                              id: filterKey.id,
                              name: filterKey.label
                            })
                          }
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
                  n === (data?.pagination?.current_page || 1)
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
    </div>
  )
}
