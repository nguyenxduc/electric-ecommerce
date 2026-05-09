import { useState, useMemo } from 'react'
import { Edit3, Trash2, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useAdminFilterOptions,
  useDeleteAdminFilterOption,
  useSyncFilterOptions,
  useAdminCategories
} from '../../hooks'
import { useFilterKeys } from '../../hooks/useFilterKeys'
import { toast } from 'sonner'
import ConfirmModal from '../../../client/components/common/ConfirmModal'
import AdminPagination from '../../components/common/AdminPagination'
import { useListQueryParams } from '../../hooks/useListQueryParams'

export default function AdminFiltersList() {
  const [limit] = useState(10)
  const { searchParams, setSearchParams, page, q: query, setPage } =
    useListQueryParams()

  // Get parameters from URL
  const filterKey = searchParams.get('key') || ''
  const filterCategory = searchParams.get('category') || ''
  const filterActive = searchParams.get('active') || ''

  const { data, isLoading } = useAdminFilterOptions({
    page,
    limit,
    q: query || undefined,
    key: filterKey || undefined,
    category_id: filterCategory
      ? filterCategory === 'null'
        ? undefined
        : Number(filterCategory)
      : undefined,
    is_active: filterActive ? filterActive === 'true' : undefined
  })
  const { data: categoriesData } = useAdminCategories({ limit: 100 })
  const { data: filterKeysData } = useFilterKeys({ limit: 100 })
  const del = useDeleteAdminFilterOption()
  const sync = useSyncFilterOptions()
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  // Ensure filterOptions is always an array
  // data is { data: FilterOptionListResponseWithSuccess }
  // FilterOptionListResponseWithSuccess = { success: boolean, data: FilterOption[] }
  // So we need: data.data.data to get the array
  const filterOptions = Array.isArray(data?.data?.data) ? data.data.data : []
  const categories = Array.isArray(categoriesData?.data?.categories)
    ? categoriesData.data.categories
    : []
  const filterKeys = Array.isArray((filterKeysData as any)?.data)
    ? (filterKeysData as any).data
    : []

  const pages = useMemo(
    () => Math.max(1, data?.data?.pagination?.total_pages || 1),
    [data]
  )

  // Update URL when parameters change
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    params.set('page', '1') // Reset to first page when filters change
    setSearchParams(params)
  }

  // Get all available filter keys from the database instead of just from current results
  const availableKeys = filterKeys.map((fk: any) => ({
    key: fk.key,
    label: fk.label
  }))

  const handleSync = async () => {
    try {
      await sync.mutateAsync(undefined)
      toast.success('Filter options synced successfully')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to sync filter options')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await del.mutateAsync(id)
      toast.success('Filter option deleted')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete filter option')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Filter Options</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={sync.isPending}
            className="px-3 py-2 bg-gray-600 text-white rounded text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={sync.isPending ? 'animate-spin' : ''}
            />
            Sync from Products
          </button>
          <Link
            to="/admin/filters/new"
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            New Filter Option
          </Link>
        </div>
      </div>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete filter option?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete === null) return
          handleDelete(pendingDelete).finally(() => setPendingDelete(null))
        }}
      />

      <div className="bg-white p-4 rounded border grid gap-3">
        <div className="grid grid-cols-4 gap-3">
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Search by ID, key, label, or value"
            value={query}
            onChange={e => updateParams({ q: e.target.value || null })}
          />
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filterKey}
            onChange={e => updateParams({ key: e.target.value || null })}
          >
            <option value="">All Keys</option>
            {availableKeys.map((keyObj: { key: string; label: string }) => (
              <option key={keyObj.key} value={keyObj.key}>
                {keyObj.label} ({keyObj.key})
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filterCategory}
            onChange={e => updateParams({ category: e.target.value || null })}
          >
            <option value="">All Categories</option>
            <option value="null">Global (No Category)</option>
            {categories.map(cat => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filterActive}
            onChange={e => updateParams({ active: e.target.value || null })}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded border">
        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Label</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Display</th>
                  <th className="text-left p-2">Query</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Order</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterOptions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-500">
                      No filter options found
                    </td>
                  </tr>
                ) : (
                  filterOptions.map(opt => (
                    <FilterRow
                      key={opt.id}
                      option={opt}
                      onEdit={() => {
                        window.location.href = `/admin/filters/${opt.id}`
                      }}
                      onDelete={() => setPendingDelete(Number(opt.id))}
                    />
                  ))
                )}
              </tbody>
            </table>

            <AdminPagination
              page={data?.data?.pagination?.current_page || page}
              totalPages={pages}
              onPageChange={setPage}
              totalItems={data?.data?.pagination?.total_count}
            />
          </>
        )}
      </div>
    </div>
  )
}

function FilterRow({
  option,
  onEdit,
  onDelete
}: {
  option: any
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <tr className="border-t">
      <td className="p-2">{option.id}</td>
      <td className="p-2">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
          {option.filter_key?.key || option.key}
        </span>
      </td>
      <td className="p-2">{option.filter_key?.label || option.label}</td>
      <td className="p-2 font-medium">{option.value}</td>
      <td className="p-2">
        {option.display_value ? (
          <span className="text-sm text-green-700">{option.display_value}</span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </td>
      <td className="p-2">
        {option.query_value ? (
          <span className="text-sm text-blue-700 font-mono">
            {option.query_value}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </td>
      <td className="p-2">
        {option.category ? (
          <span className="text-sm">{option.category.name}</span>
        ) : (
          <span className="text-gray-400 text-sm">Global</span>
        )}
      </td>
      <td className="p-2">{option.order}</td>
      <td className="p-2">
        <span
          className={`px-2 py-1 rounded text-xs ${
            option.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {option.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="p-2 w-24">
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
