import React from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminOrder, useUpdateAdminOrderStatus } from '../../hooks'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function AdminOrderDetail() {
  const { id } = useParams()
  const oid = Number(id)
  const { data, isLoading } = useAdminOrder(oid)
  const update = useUpdateAdminOrderStatus(oid)

  if (isLoading) return <div className="p-6">Loading...</div>

  const order = data?.data
  if (!order) return null

  const addressObj = (order as any).shipping_address || {}
  const receiverName = (order as any).receiver_name || addressObj.name || '—'
  const receiverPhone = (order as any).receiver_phone || addressObj.phone || '—'
  const addressText =
    typeof addressObj === 'string'
      ? addressObj
      : addressObj.address ||
        [
          addressObj.street,
          addressObj.city,
          addressObj.state,
          addressObj.country
        ]
          .filter(Boolean)
          .join(', ')

  const statusOptions = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Order{' '}
            {order.order_number ? `#${order.order_number}` : `#${order.id}`}
          </h1>
          <p className="text-sm text-gray-500">
            Created:{' '}
            {order.created_at
              ? new Date(order.created_at).toLocaleString()
              : '—'}
          </p>
        </div>
        <select
          className="border rounded px-2 py-1"
          value={order.status}
          onChange={e => {
            const next = e.target.value as any
            update.mutate(
              { status: next },
              {
                onSuccess: () => toast.success('Order status updated'),
                onError: () => toast.error('Failed to update status')
              }
            )
          }}
          disabled={update.isPending}
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded border p-3">
          <div className="text-sm text-gray-500">Customer</div>
          <div className="mt-1 text-sm">
            {order.user?.name} ({order.user?.email})
          </div>
        </div>
        <div className="bg-white rounded border p-3">
          <div className="text-sm text-gray-500">Receiver</div>
          <div className="mt-1 text-sm font-medium">{receiverName}</div>
          <div className="text-xs text-gray-600">{receiverPhone}</div>
        </div>
        <div className="bg-white rounded border p-3">
          <div className="text-sm text-gray-500">Payment</div>
          <div className="mt-1 text-sm capitalize">
            {order.payment_method || '—'}
          </div>
        </div>
      </div>
      <div className="bg-white rounded border p-3">
        <div className="text-sm text-gray-500">Shipping address</div>
        <div className="mt-1 text-sm">{addressText || '—'}</div>
      </div>
      <div className="bg-white rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Product</th>
              <th className="text-left p-2">Qty</th>
              <th className="text-left p-2">Unit Price</th>
              <th className="text-left p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map(it => {
              const anyIt = it as any
              const name = anyIt.product?.name || `#${it.product_id}`
              const img =
                (Array.isArray(anyIt.product?.img) &&
                  anyIt.product?.img?.[0]) ||
                anyIt.product?.image_url
              return (
                <tr key={`${it.product_id}-${it.id}`} className="border-t">
                  <td className="p-2 flex items-center gap-2">
                    {img && (
                      <img
                        src={img}
                        alt={name}
                        className="w-10 h-10 object-cover rounded border"
                      />
                    )}
                    <span>{name}</span>
                  </td>
                  <td className="p-2">{it.quantity}</td>
                  <td className="p-2">
                    {formatCurrency(Number(it.unit_price))}
                  </td>
                  <td className="p-2">
                    {formatCurrency(Number(it.total_price))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
