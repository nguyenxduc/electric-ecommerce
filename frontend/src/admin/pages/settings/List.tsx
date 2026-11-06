import { useState } from 'react'
import {
  Save,
  Trash2,
  Plus,
  Settings2,
  Building2,
  Truck,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useSettings,
  useUpsertSetting,
  useUpdateSetting,
  useDeleteSetting
} from '../../hooks/useSettings'
import type {
  Setting,
  UpsertSettingPayload
} from '../../services/settingService'
import ConfirmModal from '../../../client/components/common/ConfirmModal'

const CATEGORIES = [
  { value: 'bank', label: 'Bank Settings', icon: Building2 },
  { value: 'shipping', label: 'Shipping Settings', icon: Truck },
  { value: 'general', label: 'General Settings', icon: Globe }
]

export default function SettingsList() {
  const [selectedCategory, setSelectedCategory] = useState<string>('bank')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<{
    key: string
    name: string
  } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const { data, isLoading, error } = useSettings(selectedCategory)
  const upsertMutation = useUpsertSetting()
  const updateMutation = useUpdateSetting()
  const deleteMutation = useDeleteSetting()

  const settings = data?.settings || []

  const handleSave = async (setting: Setting, newValue: any) => {
    try {
      const payload: Partial<UpsertSettingPayload> = {
        value: newValue,
        description: setting.description || undefined,
        category: setting.category,
        data_type: setting.data_type,
        is_public: setting.is_public
      }

      await updateMutation.mutateAsync({
        key: setting.key,
        payload
      })

      toast.success('Setting updated successfully')
      setEditingKey(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update setting')
    }
  }

  const handleDelete = async (key: string) => {
    try {
      await deleteMutation.mutateAsync(key)
      toast.success('Setting deleted successfully')
      setShowDeleteModal(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete setting')
    }
  }

  const handleAddNew = async (payload: UpsertSettingPayload) => {
    try {
      await upsertMutation.mutateAsync(payload)
      toast.success('Setting created successfully')
      setShowAddModal(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create setting')
    }
  }

  const parseValue = (value: string, dataType: string): any => {
    if (dataType === 'number') return Number(value)
    if (dataType === 'boolean') return value === 'true'
    if (dataType === 'json') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  }

  const formatValue = (value: any, dataType: string): string => {
    if (dataType === 'json') return JSON.stringify(value, null, 2)
    return String(value)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load settings. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Setting
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                selectedCategory === cat.value
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Settings List */}
      <div className="bg-white rounded-lg border">
        {settings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No settings found for this category
          </div>
        ) : (
          <div className="divide-y">
            {settings.map(setting => (
              <SettingItem
                key={setting.key}
                setting={setting}
                isEditing={editingKey === setting.key}
                onStartEdit={() => setEditingKey(setting.key)}
                onCancelEdit={() => setEditingKey(null)}
                onSave={handleSave}
                onDelete={() =>
                  setShowDeleteModal({ key: setting.key, name: setting.key })
                }
                parseValue={parseValue}
                formatValue={formatValue}
              />
            ))}
          </div>
        )}
      </div>

      <OperationsSection />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <ConfirmModal
          open={true}
          title="Delete Setting"
          description={`Are you sure you want to delete "${showDeleteModal.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => handleDelete(showDeleteModal.key)}
          onClose={() => setShowDeleteModal(null)}
          tone="danger"
        />
      )}

      {/* Add Setting Modal */}
      {showAddModal && (
        <AddSettingModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddNew}
          defaultCategory={selectedCategory}
        />
      )}
    </div>
  )
}

function SettingItem({
  setting,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  parseValue,
  formatValue
}: {
  setting: Setting
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (setting: Setting, value: any) => void
  onDelete: () => void
  parseValue: (value: string, dataType: string) => any
  formatValue: (value: any, dataType: string) => string
}) {
  const parsedValue = parseValue(setting.value, setting.data_type)
  const [editValue, setEditValue] = useState(
    formatValue(parsedValue, setting.data_type)
  )

  const handleSave = () => {
    const newValue = parseValue(editValue, setting.data_type)
    onSave(setting, newValue)
  }

  const handleCancel = () => {
    setEditValue(formatValue(parsedValue, setting.data_type))
    onCancelEdit()
  }

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{setting.key}</h3>
            {setting.is_public && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                Public
              </span>
            )}
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {setting.data_type}
            </span>
          </div>
          {setting.description && (
            <p className="text-sm text-gray-600 mb-2">{setting.description}</p>
          )}

          {isEditing ? (
            <div className="space-y-2 mt-3">
              {setting.data_type === 'boolean' ? (
                <select
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : setting.data_type === 'json' ? (
                <textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  placeholder="Enter JSON"
                />
              ) : (
                <input
                  type={setting.data_type === 'number' ? 'number' : 'text'}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded">
                {setting.data_type === 'json'
                  ? JSON.stringify(parsedValue, null, 2)
                  : String(parsedValue)}
              </p>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2">
            <button
              onClick={onStartEdit}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AddSettingModal({
  open,
  onClose,
  onSave,
  defaultCategory
}: {
  open: boolean
  onClose: () => void
  onSave: (payload: UpsertSettingPayload) => void
  defaultCategory: string
}) {
  const [formData, setFormData] = useState<UpsertSettingPayload>({
    key: '',
    value: '',
    description: '',
    category: defaultCategory,
    data_type: 'string',
    is_public: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !formData.key ||
      formData.value === undefined ||
      formData.value === ''
    ) {
      toast.error('Key and value are required')
      return
    }

    // Parse value based on data type
    let parsedValue: any = formData.value
    if (formData.data_type === 'number') {
      parsedValue = Number(formData.value)
      if (isNaN(parsedValue)) {
        toast.error('Invalid number')
        return
      }
    } else if (formData.data_type === 'boolean') {
      parsedValue = formData.value === 'true' || formData.value === true
    } else if (formData.data_type === 'json') {
      try {
        parsedValue = JSON.parse(String(formData.value))
      } catch {
        toast.error('Invalid JSON')
        return
      }
    }

    onSave({
      ...formData,
      value: parsedValue
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Add New Setting</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Key *</label>
            <input
              type="text"
              value={formData.key}
              onChange={e => setFormData({ ...formData, key: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., bank_account_no"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Value *</label>
            {formData.data_type === 'boolean' ? (
              <select
                value={String(formData.value)}
                onChange={e =>
                  setFormData({ ...formData, value: e.target.value === 'true' })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : formData.data_type === 'json' ? (
              <textarea
                value={String(formData.value)}
                onChange={e =>
                  setFormData({ ...formData, value: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                placeholder='{"key": "value"}'
              />
            ) : (
              <input
                type={formData.data_type === 'number' ? 'number' : 'text'}
                value={String(formData.value)}
                onChange={e =>
                  setFormData({ ...formData, value: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description || ''}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Data Type
              </label>
              <select
                value={formData.data_type}
                onChange={e =>
                  setFormData({
                    ...formData,
                    data_type: e.target
                      .value as UpsertSettingPayload['data_type']
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={e =>
                setFormData({ ...formData, is_public: e.target.checked })
              }
              className="w-4 h-4"
            />
            <label htmlFor="is_public" className="text-sm">
              Public (accessible without authentication)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type OpDef = {
  key: string
  label: string
  type: 'number' | 'boolean' | 'select' | 'text'
  options?: string[]
  fallback: string
  category: string
}
const OPS: OpDef[] = [
  { key: 'shipping_provider', label: 'Shipping provider', type: 'select', options: ['mock', 'ghn', 'ghtk'], fallback: 'mock', category: 'shipping' },
  { key: 'shipping_rate_mode', label: 'Shipping rate mode', type: 'select', options: ['flat', 'carrier'], fallback: 'flat', category: 'shipping' },
  { key: 'order_payment_timeout_minutes', label: 'Unpaid order timeout (minutes)', type: 'number', fallback: '30', category: 'general' },
  { key: 'cod_require_verified_phone', label: 'COD requires verified phone', type: 'boolean', fallback: 'false', category: 'general' },
  { key: 'fraud_block_score', label: 'Fraud block score', type: 'number', fallback: '100', category: 'general' },
  { key: 'fraud_review_score', label: 'Fraud review score', type: 'number', fallback: '40', category: 'general' },
  { key: 'fraud_velocity_orders_per_hour', label: 'Fraud velocity (orders/hour)', type: 'number', fallback: '5', category: 'general' },
  { key: 'fraud_new_account_cod_amount', label: 'Fraud new-account COD amount', type: 'number', fallback: '500', category: 'general' },
  { key: 'invoice_vat_rate', label: 'Invoice VAT rate', type: 'number', fallback: '0.1', category: 'general' },
  { key: 'invoice_series', label: 'Invoice series', type: 'text', fallback: '', category: 'general' },
  { key: 'tax_withhold_vat_rate', label: 'Tax withhold VAT rate', type: 'number', fallback: '0.01', category: 'general' },
  { key: 'tax_withhold_pit_rate', label: 'Tax withhold PIT rate', type: 'number', fallback: '0.005', category: 'general' }
]

function OperationsSection() {
  const { data } = useSettings()
  const upsert = useUpsertSetting()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const existing = (key: string) => data?.settings.find(s => s.key === key)

  const save = async (def: OpDef) => {
    const raw = draft[def.key] ?? existing(def.key)?.value ?? def.fallback
    if (raw === '') return toast.error('Value is required')
    if (def.type === 'number' && isNaN(Number(raw))) return toast.error('Invalid number')
    try {
      await upsert.mutateAsync({
        key: def.key,
        value: def.type === 'number' ? Number(raw) : def.type === 'boolean' ? raw === 'true' : raw,
        category: def.category,
        data_type: def.type === 'select' || def.type === 'text' ? 'string' : def.type,
        description: def.label,
        is_public: existing(def.key)?.is_public ?? false
      })
      setDraft(d => {
        const { [def.key]: _, ...rest } = d
        return rest
      })
      toast.success(`${def.label} saved`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save setting')
    }
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b font-semibold">Operations</div>
      <div className="divide-y">
        {OPS.map(def => {
          const value = draft[def.key] ?? existing(def.key)?.value ?? def.fallback
          const set = (v: string) => setDraft(d => ({ ...d, [def.key]: v }))
          return (
            <div key={def.key} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">{def.label}</div>
                <div className="text-xs font-mono text-gray-500">
                  {def.key}
                  {!existing(def.key) && ' (not set)'}
                </div>
              </div>
              {def.type === 'select' || def.type === 'boolean' ? (
                <select value={value} onChange={e => set(e.target.value)} className="w-48 px-3 py-2 border rounded-lg">
                  {(def.options ?? ['true', 'false']).map(o => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={def.type === 'number' ? 'number' : 'text'}
                  step="any"
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="w-48 px-3 py-2 border rounded-lg"
                />
              )}
              <button
                onClick={() => save(def)}
                disabled={upsert.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
