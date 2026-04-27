import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Edit3, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAdminCoupons,
  useCreateAdminCoupon,
  useDeleteAdminCoupon,
  useUpdateAdminCoupon
} from '../../hooks/useCoupons'
import Modal from '../../components/common/Modal'
import SkeletonTable from '../../components/common/SkeletonTable'
import { DiscountType, UpdateCouponRequest } from '../../types'
import ConfirmModal from '../../../client/components/common/ConfirmModal'

export default function AdminCouponsList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(10)

  // Get parameters from URL
  const page = parseInt(searchParams.get('page') || '1', 10)
  const query = searchParams.get('q') || ''

  const { data, isLoading } = useAdminCoupons({
    page,
    limit,
    q: query || undefined
  })
  const del = useDeleteAdminCoupon()
  const createMut = useCreateAdminCoupon()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState<null | number>(null)
  const updateMut = useUpdateAdminCoupon(editOpen || 0)

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

  const onDelete = (id: number) => setConfirmId(id)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coupons</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 text-sm w-56"
            placeholder="Search by code"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button
            className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60"
            onClick={() => navigate('/admin/coupons/new')}
            disabled={createMut.isPending}
          >
            New Coupon
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmId !== null}
        title="Delete coupon?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onClose={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId === null) return
          del.mutate(confirmId, {
            onSuccess: () => toast.success('Coupon deleted'),
            onError: () => toast.error('Failed to delete coupon'),
            onSettled: () => setConfirmId(null)
          })
        }}
      />

      <div className="bg-white rounded border">
        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Min Order</th>
                  <th className="text-left p-2">Usage</th>
                  <th className="text-left p-2">Expires</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.coupons?.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 font-medium">{c.code}</td>
                    <td className="p-2">{c.discount_type}</td>
                    <td className="p-2">{Number(c.discount_value)}</td>
                    <td className="p-2">
                      {c.min_order ? Number(c.min_order) : '-'}
                    </td>
                    <td className="p-2">
                      {c.used_count ?? 0}/{c.usage_limit ?? '∞'}
                    </td>
                    <td className="p-2">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <button
                          title="Edit"
                          className="text-blue-600"
                          onClick={() => setEditOpen(c.id)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          title="Delete"
                          className="text-red-600"
                          onClick={() => onDelete(c.id)}
                        >
                          <Trash2 size={16} />
                        </button>
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
                        ? 'bg-green-600 text-white border-green-600'
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

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Coupon"
        footer={
          <>
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setCreateOpen(false)}
              disabled={createMut.isPending}
            >
              Cancel
            </button>
            <button
              form="createCouponForm"
              type="submit"
              className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60"
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Creating...' : 'Create'}
            </button>
          </>
        }
      >
        <form
          id="createCouponForm"
          className="space-y-3"
          onSubmit={async e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget as HTMLFormElement)
            try {
              await createMut.mutateAsync({
                code: String(fd.get('code') || ''),
                description: String(fd.get('description') || '') || undefined,
                discount_type: String(
                  fd.get('discount_type') || 'percent'
                ) as DiscountType,
                discount_value: Number(fd.get('discount_value') || 0),
                min_order: fd.get('min_order')
                  ? Number(fd.get('min_order'))
                  : undefined,
                usage_limit: fd.get('usage_limit')
                  ? Number(fd.get('usage_limit'))
                  : undefined,
                expires_at: fd.get('expires_at')
                  ? String(fd.get('expires_at'))
                  : undefined
              })
              toast.success('Coupon created')
              setCreateOpen(false)
            } catch (err) {
              toast.error('Failed to create coupon')
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Code</label>
              <input
                name="code"
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                name="discount_type"
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Value</label>
              <input
                type="number"
                step="0.01"
                name="discount_value"
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Min Order
              </label>
              <input
                type="number"
                step="0.01"
                name="min_order"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                name="usage_limit"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Expires
              </label>
              <input
                type="date"
                name="expires_at"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Description
            </label>
            <textarea
              name="description"
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editOpen}
        onClose={() => setEditOpen(null)}
        title={`Edit Coupon`}
        footer={
          <>
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setEditOpen(null)}
              disabled={updateMut.isPending}
            >
              Cancel
            </button>
            <button
              form="editCouponForm"
              type="submit"
              className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-60"
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form
          id="editCouponForm"
          className="space-y-3"
          onSubmit={async e => {
            e.preventDefault()
            if (!editOpen) return
            const fd = new FormData(e.currentTarget as HTMLFormElement)
            const payload: UpdateCouponRequest = {
              code: fd.get('code') ? String(fd.get('code')) : undefined,
              description: fd.get('description')
                ? String(fd.get('description'))
                : undefined,
              discount_type: fd.get('discount_type')
                ? (String(fd.get('discount_type')) as DiscountType)
                : undefined,
              discount_value: fd.get('discount_value')
                ? Number(fd.get('discount_value'))
                : undefined,
              min_order: fd.get('min_order')
                ? Number(fd.get('min_order'))
                : undefined,
              usage_limit: fd.get('usage_limit')
                ? Number(fd.get('usage_limit'))
                : undefined,
              expires_at: fd.get('expires_at')
                ? String(fd.get('expires_at'))
                : undefined
            }
            try {
              await updateMut.mutateAsync(payload)
              toast.success('Coupon updated')
              setEditOpen(null)
            } catch (err) {
              toast.error('Failed to update coupon')
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Code</label>
              <input
                name="code"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <select
                name="discount_type"
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Value</label>
              <input
                type="number"
                step="0.01"
                name="discount_value"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Min Order
              </label>
              <input
                type="number"
                step="0.01"
                name="min_order"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Usage Limit
              </label>
              <input
                type="number"
                name="usage_limit"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Expires
              </label>
              <input
                type="date"
                name="expires_at"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Description
            </label>
            <textarea
              name="description"
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Confirm delete coupon"
        variant="danger"
        footer={
          <>
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setConfirmId(null)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-2 bg-red-600 text-white rounded"
              onClick={() => {
                if (confirmId) del.mutate(confirmId)
                setConfirmId(null)
              }}
            >
              Delete
            </button>
          </>
        }
      >
        Are you sure you want to delete this coupon? This action cannot be
        undone.
      </Modal>
    </div>
  )
}
