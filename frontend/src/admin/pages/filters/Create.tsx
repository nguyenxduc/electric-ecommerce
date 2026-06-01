import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateAdminFilterOption, useAdminCategories } from '../../hooks'
import { useActiveFilterKeys } from '../../hooks/useFilterKeys'
import { toast } from 'sonner'

export default function AdminFilterCreate() {
  const nav = useNavigate()
  const create = useCreateAdminFilterOption()
  const { data: categoriesData } = useAdminCategories({ limit: 100 })
  const { data: filterKeysData } = useActiveFilterKeys()

  const [filterKeyId, setFilterKeyId] = useState('')
  const [value, setValue] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [queryValue, setQueryValue] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [order, setOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  const categories = categoriesData?.data?.categories || []
  const filterKeys = filterKeysData?.data || []

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filterKeyId || !value) {
      toast.error('Filter key and value are required')
      return
    }

    const selectedFilterKey = filterKeys.find(fk => fk.id === filterKeyId)
    if (!selectedFilterKey) {
      toast.error('Invalid filter key selected')
      return
    }

    try {
      await create.mutateAsync({
        filter_key_id: filterKeyId,
        value,
        display_value: displayValue || null,
        query_value: queryValue || null,
        category_id: categoryId || null,
        order,
        is_active: isActive
      })
      toast.success('Filter option created successfully')
      nav('/admin/filters')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create filter option')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">New Filter Option</h1>
        <button
          onClick={onSubmit}
          disabled={create.isPending}
          className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {create.isPending ? 'Creating...' : 'Save'}
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white p-4 rounded border max-w-xl grid gap-3"
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium">Filter Key *</label>
          <select
            className="border rounded px-3 py-2"
            value={filterKeyId}
            onChange={e => setFilterKeyId(e.target.value)}
            required
          >
            <option value="">Select a filter key</option>
            {filterKeys.map(filterKey => (
              <option key={filterKey.id} value={filterKey.id}>
                {filterKey.label} ({filterKey.key})
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500">
            Choose from existing filter keys or{' '}
            <button
              type="button"
              onClick={() => nav('/admin/filter-keys/create')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              create a new one
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Value *</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="Actual value (e.g., Apple, 8GB)"
            value={value}
            onChange={e => setValue(e.target.value)}
            required
          />
          <div className="text-xs text-gray-500">
            This is the internal value used for matching. For simple filters,
            this is also what users see.
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Display Value (Optional)
          </label>
          <input
            className="border rounded px-3 py-2"
            placeholder="What users see (e.g., '30% or more', 'On Sale')"
            value={displayValue}
            onChange={e => setDisplayValue(e.target.value)}
          />
          <div className="text-xs text-gray-500">
            Leave empty to use the Value field. Use this for user-friendly
            display text.
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Query Value (Optional)</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="Query logic (e.g., '>=30', '>0', '200-500')"
            value={queryValue}
            onChange={e => setQueryValue(e.target.value)}
          />
          <div className="text-xs text-gray-500">
            Leave empty to use the Value field. Use operators like {'>='}, {'>'}
            , {'<'}, {'<='} or ranges like 200-500.
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Category (Optional)</label>
          <select
            className="border rounded px-3 py-2"
            value={categoryId || ''}
            onChange={e =>
              setCategoryId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Global (No Category)</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Order</label>
          <input
            type="number"
            className="border rounded px-3 py-2"
            placeholder="Display order"
            value={order}
            onChange={e => setOrder(Number(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm">
            Active
          </label>
        </div>
      </form>
    </div>
  )
}
