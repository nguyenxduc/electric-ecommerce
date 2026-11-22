import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '../../../lib/apiError'
import { TicketPercent, Trash2, Plus, Pencil, Pause, Play, X } from 'lucide-react'
import {
  getMyShopCoupons,
  createShopCoupon,
  updateShopCoupon,
  deleteShopCoupon,
  type ShopCoupon
} from '../../services/sellerService'
import ConfirmModal from '../../../client/components/common/ConfirmModal'
import CouponStatusChip from '../../../client/components/common/CouponStatusChip'

type FormState = {
  code: string
  description: string
  discount_type: 'percent' | 'fixed'
  discount_value: string
  min_order: string
  max_discount: string
  usage_limit: string
  per_user_limit: string
  starts_at: string
  expires_at: string
}

const EMPTY_FORM: FormState = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '',
  min_order: '',
  max_discount: '',
  usage_limit: '100',
  per_user_limit: '1',
  starts_at: '',
  expires_at: ''
}

const toInputDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const toForm = (c: ShopCoupon): FormState => ({
  code: c.code,
  description: c.description ?? '',
  discount_type: c.discount_type,
  discount_value: String(Number(c.discount_value)),
  min_order: c.min_order != null ? String(Number(c.min_order)) : '',
  max_discount: c.max_discount != null ? String(Number(c.max_discount)) : '',
  usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
  per_user_limit: c.per_user_limit != null ? String(c.per_user_limit) : '',
  starts_at: toInputDate(c.starts_at),
  expires_at: toInputDate(c.expires_at)
})
// Truong de trong = xoa (khong toi thieu / khong tran / khong gioi han / khong lich)
const toPayload = (f: FormState) => ({
  description: f.description.trim(),
  discount_type: f.discount_type,
  discount_value: Number(f.discount_value),
  min_order: f.min_order ? Number(f.min_order) : null,
  max_discount: f.discount_type === 'percent' && f.max_discount ? Number(f.max_discount) : null,
  usage_limit: f.usage_limit ? Number(f.usage_limit) : null,
  per_user_limit: f.per_user_limit ? Number(f.per_user_limit) : null,
  starts_at: f.starts_at || null,
  expires_at: f.expires_at || null
})

export default function SellerCouponsList() {
  const qc = useQueryClient()
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['seller', 'coupons'],
    queryFn: getMyShopCoupons
  })

  // null = dong; 'new' = tao; so = id dang sua
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['seller', 'coupons'] })

  const saveMut = useMutation({
    mutationFn: () =>
      editing === 'new'
        ? createShopCoupon({ ...toPayload(form), code: form.code.trim() })
        : updateShopCoupon(editing as number, toPayload(form)),
    onSuccess: () => {
      toast.success(editing === 'new' ? 'Shop voucher created' : 'Voucher updated')
      setEditing(null)
      invalidate()
    },
    onError: (err: unknown) =>
      toast.error(apiErrorMessage(err, 'Failed to save voucher'))
  })

  const toggleMut = useMutation({
    mutationFn: (c: ShopCoupon) => updateShopCoupon(c.id, { is_active: !c.is_active }),
    onSuccess: (_d, c) => {
      toast.success(c.is_active ? 'Voucher paused' : 'Voucher resumed')
      invalidate()
    },
    onError: (err: unknown) =>
      toast.error(apiErrorMessage(err, 'Failed to update voucher'))
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteShopCoupon(id),
    onSuccess: () => {
      toast.success('Voucher deleted')
      invalidate()
    },
    onError: (err: unknown) =>
      toast.error(apiErrorMessage(err, 'Failed to delete voucher'))
  })

  const field = 'w-full border rounded px-3 py-2'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <TicketPercent className="w-5 h-5" /> Shop Vouchers
        </h1>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-1"
          onClick={() => {
            setForm(EMPTY_FORM)
            setEditing('new')
          }}
        >
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Vouchers here only discount items from your shop. Buyers collect them
        from your shop and product pages.
      </p>

      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 grid md:grid-cols-2 gap-3 relative"
            onSubmit={e => {
              e.preventDefault()
              if (!form.code.trim() || !form.discount_value) {
                toast.error('Code and discount value are required')
                return
              }
              // Bat loi o form truoc, thay vi de server tra thong bao tho
              if (form.discount_type === 'percent' && Number(form.discount_value) > 100) {
                toast.error('A percentage discount cannot be more than 100%')
                return
              }
              if (form.starts_at && form.expires_at && form.starts_at >= form.expires_at) {
                toast.error('The start date must be before the expiry date')
                return
              }
              saveMut.mutate()
            }}
          >
            <div className="md:col-span-2 flex items-center justify-between">
              <h2 className="font-semibold">
                {editing === 'new' ? 'New voucher' : `Edit ${form.code}`}
              </h2>
              <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm">
              <span className="block mb-1">Code *</span>
              <input
                className={`${field} uppercase disabled:bg-gray-100`}
                value={form.code}
                disabled={editing !== 'new'}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="MYSHOP10"
              />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Description</span>
              <input className={field} value={form.description} onChange={set('description')} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Type</span>
              <select className={field} value={form.discount_type} onChange={set('discount_type')}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="block mb-1">
                Value * {form.discount_type === 'percent' ? '(%)' : '($)'}
              </span>
              <input type="number" min="0" max={form.discount_type === 'percent' ? 100 : undefined} step="0.01" className={field} value={form.discount_value} onChange={set('discount_value')} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Min order ($)</span>
              <input type="number" min="0" step="0.01" className={field} value={form.min_order} onChange={set('min_order')} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Max discount ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${field} disabled:bg-gray-100`}
                disabled={form.discount_type !== 'percent'}
                placeholder={form.discount_type === 'percent' ? 'No cap' : 'Percent vouchers only'}
                value={form.max_discount}
                onChange={set('max_discount')}
              />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Usage limit</span>
              <input type="number" min="1" className={field} placeholder="Unlimited" value={form.usage_limit} onChange={set('usage_limit')} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Uses per buyer</span>
              <input type="number" min="1" step="1" className={field} placeholder="Unlimited" value={form.per_user_limit} onChange={set('per_user_limit')} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Starts at</span>
              <input type="date" className={field} value={form.starts_at} onChange={set('starts_at')} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Expires at</span>
              <input type="date" className={field} value={form.expires_at} onChange={set('expires_at')} />
            </label>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMut.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
              >
                {saveMut.isPending ? 'Saving...' : editing === 'new' ? 'Create voucher' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
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
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Discount</th>
                <th className="text-left p-2">Min order</th>
                <th className="text-left p-2">Used</th>
                <th className="text-left p-2">Validity</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No shop vouchers yet.
                  </td>
                </tr>
              )}
              {coupons.map(c => (
                <tr key={c.id} className="border-t" data-testid={`seller-coupon-${c.code}`}>
                  <td className="p-2 font-semibold">{c.code}</td>
                  <td className="p-2"><CouponStatusChip status={c.status} /></td>
                  <td className="p-2 whitespace-nowrap">
                    {c.discount_type === 'percent'
                      ? `${Number(c.discount_value)}%`
                      : `$${Number(c.discount_value)}`}
                    {c.discount_type === 'percent' && c.max_discount != null && (
                      <span className="text-xs text-gray-500"> (max ${Number(c.max_discount)})</span>
                    )}
                  </td>
                  <td className="p-2">
                    {c.min_order ? `$${Number(c.min_order)}` : '—'}
                  </td>
                  <td className="p-2">
                    {c.used_count ?? 0}/{c.usage_limit ?? '∞'}
                  </td>
                  <td className="p-2 whitespace-nowrap text-xs">
                    {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : 'Now'}
                    {' → '}
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-blue-600"
                        title="Edit"
                        aria-label={`Edit ${c.code}`}
                        onClick={() => {
                          setForm(toForm(c))
                          setEditing(c.id)
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="text-amber-600 disabled:opacity-50"
                        title={c.is_active ? 'Pause' : 'Resume'}
                        aria-label={`${c.is_active ? 'Pause' : 'Resume'} ${c.code}`}
                        disabled={toggleMut.isPending}
                        onClick={() => toggleMut.mutate(c)}
                      >
                        {c.is_active ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        className="text-red-600"
                        title="Delete"
                        aria-label={`Delete ${c.code}`}
                        onClick={() => setPendingDelete(c.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
