import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useFilterKey, useUpdateFilterKey } from '../../hooks/useFilterKeys'

const DATA_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'range', label: 'Range' }
]

export default function EditFilterKey() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useFilterKey(id!)
  const updateFilterKey = useUpdateFilterKey(id!)

  const [formData, setFormData] = useState({
    label: '',
    description: '',
    data_type: 'string' as const,
    is_active: true,
    order: 0
  })

  const filterKey = data?.data

  useEffect(() => {
    if (filterKey) {
      setFormData({
        label: filterKey.label,
        description: filterKey.description || '',
        data_type: filterKey.data_type,
        is_active: filterKey.is_active,
        order: filterKey.order
      })
    }
  }, [filterKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.label) {
      toast.error('Label is required')
      return
    }

    try {
      await updateFilterKey.mutateAsync({
        label: formData.label,
        description: formData.description || undefined,
        data_type: formData.data_type,
        is_active: formData.is_active,
        order: formData.order
      })
      toast.success('Filter key updated successfully')
      navigate('/admin/filter-keys')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to update filter key'
      )
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!filterKey) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Filter Key Not Found
          </h2>
          <p className="text-gray-600 mt-2">
            The filter key you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/admin/filter-keys')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Filter Keys
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/filter-keys')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Filter Key</h1>
          <p className="text-gray-600">Update filter key: {filterKey.key}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key
              </label>
              <input
                type="text"
                value={filterKey.key}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Key cannot be changed after creation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label *
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={e => handleChange('label', e.target.value)}
                placeholder="e.g., Brand, RAM, Screen Size"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Display name shown to users
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Optional description for this filter key"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type
              </label>
              <select
                value={formData.data_type}
                onChange={e => handleChange('data_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DATA_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={e =>
                  handleChange('order', parseInt(e.target.value) || 0)
                }
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center h-10">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => handleChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          {filterKey.options_count && filterKey.options_count > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This filter key has{' '}
                {filterKey.options_count} associated options. Changes to the
                data type may affect how these options are displayed and
                validated.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/admin/filter-keys')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateFilterKey.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateFilterKey.isPending ? 'Updating...' : 'Update Filter Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
