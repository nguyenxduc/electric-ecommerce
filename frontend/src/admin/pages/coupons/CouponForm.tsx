import React, { useState } from 'react'
import { AdminCoupon, CreateCouponRequest, DiscountType } from '../../types'

// Form chung cho trang tao va sua voucher cua admin. Gia tri giu dang chuoi
// cua input; de trong = xoa (khong toi thieu / khong tran / khong lich).
type Fields = Record<
  | 'code'
  | 'description'
  | 'discount_type'
  | 'discount_value'
  | 'min_order'
  | 'max_discount'
  | 'usage_limit'
  | 'per_user_limit'
  | 'starts_at'
  | 'expires_at',
  string
> & { is_active: boolean }

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const day = (v?: string | null) => (v ? v.slice(0, 10) : '')

const fromCoupon = (c?: AdminCoupon): Fields => ({
  code: str(c?.code),
  description: str(c?.description),
  discount_type: str(c?.discount_type) || 'percent',
  discount_value: c ? String(Number(c.discount_value)) : '',
  min_order: c?.min_order != null ? String(Number(c.min_order)) : '',
  max_discount: c?.max_discount != null ? String(Number(c.max_discount)) : '',
  usage_limit: str(c?.usage_limit),
  per_user_limit: str(c?.per_user_limit),
  starts_at: day(c?.starts_at),
  expires_at: day(c?.expires_at),
  is_active: c?.is_active ?? true
})

const num = (v: string) => (v === '' ? null : Number(v))

export default function CouponForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel
}: {
  initial?: AdminCoupon
  submitLabel: string
  onSubmit: (payload: CreateCouponRequest) => void | Promise<void>
  onCancel: () => void
}) {
  const [f, setF] = useState<Fields>(() => fromCoupon(initial))
  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setF(prev => ({ ...prev, [name]: value }))
  }
  const isPercent = f.discount_type === 'percent'
  const input = 'w-full border rounded px-3 py-2 text-sm'

  return (
    <form
      className="bg-white rounded border p-4 space-y-3"
      onSubmit={e => {
        e.preventDefault()
        onSubmit({
          code: f.code.trim(),
          description: f.description,
          discount_type: f.discount_type as DiscountType,
          discount_value: Number(f.discount_value || 0),
          min_order: num(f.min_order),
          max_discount: isPercent ? num(f.max_discount) : null,
          usage_limit: num(f.usage_limit),
          per_user_limit: num(f.per_user_limit),
          starts_at: f.starts_at || null,
          expires_at: f.expires_at || null,
          is_active: f.is_active
        })
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Code</span>
          <input name="code" value={f.code} onChange={onChange} className={input} required />
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Discount Type</span>
          <select name="discount_type" value={f.discount_type} onChange={onChange} className={input}>
            <option value="percent">Percent</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Discount Value</span>
          <input name="discount_value" type="number" step="0.01" min="0" value={f.discount_value} onChange={onChange} className={input} required />
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Max Discount ($)</span>
          <input
            name="max_discount"
            type="number"
            step="0.01"
            min="0"
            value={f.max_discount}
            onChange={onChange}
            disabled={!isPercent}
            placeholder={isPercent ? 'No cap' : 'Percent vouchers only'}
            className={`${input} disabled:bg-gray-100`}
          />
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Min Order</span>
          <input name="min_order" type="number" step="0.01" min="0" value={f.min_order} onChange={onChange} className={input} />
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Usage Limit</span>
          <input name="usage_limit" type="number" min="1" value={f.usage_limit} onChange={onChange} placeholder="Unlimited" className={input} />
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Uses per buyer</span>
          <input name="per_user_limit" type="number" min="1" step="1" value={f.per_user_limit} onChange={onChange} placeholder="Unlimited" className={input} />
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Starts At</span>
          <input name="starts_at" type="date" value={f.starts_at} onChange={onChange} className={input} />
        </label>
        <label className="block text-sm text-gray-600">
          <span className="block mb-1">Expires At</span>
          <input name="expires_at" type="date" value={f.expires_at} onChange={onChange} className={input} />
        </label>
      </div>
      <label className="block text-sm text-gray-600">
        <span className="block mb-1">Description</span>
        <textarea name="description" value={f.description} onChange={onChange} className={input} rows={3} />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={f.is_active}
          onChange={e => setF(prev => ({ ...prev, is_active: e.target.checked }))}
        />
        Active (uncheck to pause the voucher)
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">{submitLabel}</button>
        <button type="button" className="px-3 py-2 border rounded" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
