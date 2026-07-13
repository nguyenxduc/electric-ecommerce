import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TicketPercent, Trash2, Plus } from 'lucide-react'
import {
  getMyShopCoupons,
  createShopCoupon,
  deleteShopCoupon
} from '../../services/sellerService'
import ConfirmModal from '../../../client/components/common/ConfirmModal'

export default function SellerCouponsList() {
  const qc = useQueryClient()
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['seller', 'coupons'],
    queryFn: getMyShopCoupons
  })

  const [formOpen, setFormOpen] = useState(false)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(
    'percent'
  )
  const [discountValue, setDiscountValue] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [usageLimit, setUsageLimit] = useState('100')
  const [expiresAt, setExpiresAt] = useState('')
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['seller', 'coupons'] })

  const createMut = useMutation({
    mutationFn: () =>
      createShopCoupon({
        code: code.trim(),
        description: description.trim() || undefined,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order: minOrder ? Number(minOrder) : undefined,
        usage_limit: usageLimit ? Number(usageLimit) : undefined,
        expires_at: expiresAt || undefined
      }),
    onSuccess: () => {
      toast.success('Shop voucher created')
      setFormOpen(false)
      setCode('')
      setDescription('')
      setDiscountValue('')
      setMinOrder('')
      invalidate()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to create voucher')
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteShopCoupon(id),
    onSuccess: () => {
      toast.success('Voucher deleted')
      invalidate()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to delete voucher')
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <TicketPercent className="w-5 h-5" /> Shop Vouchers
        </h1>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-1"
          onClick={() => setFormOpen(o => !o)}
        >
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Vouchers here only discount items from your shop. Buyers can collect
        the codes from your shop page.
      </p>

      {formOpen && (
        <form
          className="bg-white rounded border p-4 grid md:grid-cols-2 gap-3"
          onSubmit={e => {
            e.preventDefault()
            if (!code.trim() || !discountValue) {
              toast.error('Code and discount value are required')
              return
            }
            createMut.mutate()
          }}
        >
          <div>
            <label className="block text-sm mb-1">Code *</label>
            <input
              className="w-full border rounded px-3 py-2 uppercase"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="MYSHOP10"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={discountType}
              onChange={e =>
                setDiscountType(e.target.value as 'percent' | 'fixed')
              }
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">
              Value * {discountType === 'percent' ? '(%)' : '($)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Min order ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded px-3 py-2"
              value={minOrder}
              onChange={e => setMinOrder(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Usage limit</label>
            <input
              type="number"
              min="1"
              className="w-full border rounded px-3 py-2"
              value={usageLimit}
              onChange={e => setUsageLimit(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Expires at</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
            >
              {createMut.isPending ? 'Creating...' : 'Create voucher'}
            </button>
          </div>
        </form>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete voucher?"
        description="Buyers will no longer be able to use this code."
        confirmText="Delete"
        cancelText="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete !== null) deleteMut.mutate(pendingDelete)
          setPendingDelete(null)
        }}
      />

      <div className="bg-white rounded border">
        {isLoading ? (
          <div className="p-6 animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Discount</th>
                <th className="text-left p-2">Min order</th>
                <th className="text-left p-2">Usage</th>
                <th className="text-left p-2">Expires</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No shop vouchers yet.
                  </td>
                </tr>
              )}
              {coupons.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="p-2 font-semibold">{c.code}</td>
                  <td className="p-2">
                    {c.discount_type === 'percent'
                      ? `${Number(c.discount_value)}%`
                      : `$${Number(c.discount_value)}`}
                  </td>
                  <td className="p-2">
                    {c.min_order ? `$${Number(c.min_order)}` : '—'}
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
                    <button
                      className="text-red-600"
                      title="Delete"
                      onClick={() => setPendingDelete(c.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
