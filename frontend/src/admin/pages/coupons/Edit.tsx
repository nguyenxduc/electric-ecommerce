import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminCoupon, useUpdateAdminCoupon } from '../../hooks/useCoupons'
import { AdminCoupon, DiscountType, UpdateCouponRequest } from '../../types'

export default function AdminCouponEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const numericId = Number(id)
  const { data } = useAdminCoupon(numericId)
  const updateMut = useUpdateAdminCoupon(numericId)

  const [form, setForm] = useState<Partial<AdminCoupon>>({
    discount_type: 'percent' as DiscountType
  })

  useEffect(() => {
    if (data?.data) {
      const c = data.data
      setForm({
        code: c.code,
        description: c.description,
        discount_type: (c.discount_type as DiscountType) ?? 'percent',
        discount_value: Number(c.discount_value),
        min_order: c.min_order ? Number(c.min_order) : undefined,
        usage_limit: c.usage_limit ?? undefined,
        expires_at: c.expires_at ?? undefined
      })
    }
  }, [data])

  const onChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: UpdateCouponRequest = {
        code: form.code,
        description: form.description,
        discount_type: form.discount_type as DiscountType,
        discount_value:
          form.discount_value !== undefined
            ? Number(form.discount_value)
            : undefined,
        min_order:
          form.min_order !== undefined ? Number(form.min_order) : undefined,
        usage_limit:
          form.usage_limit !== undefined ? Number(form.usage_limit) : undefined,
        expires_at: (form.expires_at as any) ?? undefined
      }
      await updateMut.mutateAsync(payload)
      navigate('/admin/coupons')
    } catch (err) {
      // noop; could add toast
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{`Edit Coupon #${id}`}</h1>
      <form
        className="bg-white rounded border p-4 space-y-3"
        onSubmit={onSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Code</label>
            <input
              name="code"
              value={form.code || ''}
              onChange={onChange}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Discount Type
            </label>
            <select
              name="discount_type"
              value={form.discount_type as string}
              onChange={onChange}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Discount Value
            </label>
            <input
              name="discount_value"
              type="number"
              step="0.01"
              value={(form.discount_value as any) || ''}
              onChange={onChange}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Min Order
            </label>
            <input
              name="min_order"
              type="number"
              step="0.01"
              value={(form.min_order as any) || ''}
              onChange={onChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Usage Limit
            </label>
            <input
              name="usage_limit"
              type="number"
              value={(form.usage_limit as any) || ''}
              onChange={onChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Expires At
            </label>
            <input
              name="expires_at"
              type="date"
              value={
                form.expires_at ? String(form.expires_at).slice(0, 10) : ''
              }
              onChange={onChange}
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
            value={form.description || ''}
            onChange={onChange}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-3 py-2 bg-green-600 text-white rounded"
          >
            Save changes
          </button>
          <button
            type="button"
            className="px-3 py-2 border rounded"
            onClick={() => navigate('/admin/coupons')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
