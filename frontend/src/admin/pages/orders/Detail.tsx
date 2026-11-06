import React from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelShipment,
  createShipment,
  getOrderInvoice,
  getOrderShipment,
  openInvoiceHtml,
  openShipmentLabel,
  simulateShipment
} from '../../../seller/services/sellerService'
import { useAdminOrder, useUpdateAdminOrderStatus } from '../../hooks'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const errMsg = (e: any) =>
  e?.response?.data?.error || e?.response?.data?.message || 'Action failed'

function ShipmentPanel({ orderId, status }: { orderId: number; status: string }) {
  const qc = useQueryClient()
  const { data: sh } = useQuery({
    queryKey: ['shipment', orderId],
    queryFn: () => getOrderShipment(orderId)
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['shipment', orderId] })
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
  }
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
    onError: (e: any) => toast.error(errMsg(e))
  })

  const canCreate = !sh && (status === 'pending' || status === 'processing')
  if (!sh && !canCreate) return null
  return (
    <div className="bg-white rounded border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Shipment</div>
        {canCreate && (
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
            disabled={run.isPending}
            onClick={() => run.mutate(() => createShipment(orderId))}
          >
            Create shipment
          </button>
        )}
      </div>
      {sh && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <div>
              <div className="text-gray-500">Carrier</div>
              {sh.carrier}
            </div>
            <div>
              <div className="text-gray-500">Tracking</div>
              {sh.tracking_code || '—'}
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <span className="capitalize">{sh.status.replace('_', ' ')}</span>
            </div>
            <div>
              <div className="text-gray-500">Fee</div>
              {Number(sh.fee_vnd || 0).toLocaleString('vi-VN')} VND
            </div>
            <div>
              <div className="text-gray-500">COD</div>
              {Number(sh.cod_amount_vnd || 0).toLocaleString('vi-VN')} VND
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              className="px-3 py-1 border rounded"
              onClick={() =>
                openShipmentLabel(sh.id).catch(e => toast.error(errMsg(e)))
              }
            >
              Print label
            </button>
            {(sh.status === 'created' || sh.status === 'picking') && (
              <button
                className="px-3 py-1 border rounded text-red-600"
                disabled={run.isPending}
                onClick={() => run.mutate(() => cancelShipment(sh.id))}
              >
                Cancel shipment
              </button>
            )}
            {sh.carrier === 'mock' && (
              <select
                className="border rounded px-2 py-1 text-sm"
                value=""
                disabled={run.isPending}
                onChange={e => {
                  // Doc value ngay: select controlled bi reset ve '' truoc khi mutationFn chay
                  const next = e.target.value
                  if (next) run.mutate(() => simulateShipment(sh.id, next))
                }}
              >
                <option value="">Simulate...</option>
                {['picked', 'in_transit', 'delivered', 'returned', 'failed'].map(
                  s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            )}
          </div>
          {!!sh.events?.length && (
            <ul className="text-sm border-t pt-2 space-y-1">
              {sh.events.map(ev => (
                <li key={ev.id} className="flex gap-2">
                  <span className="text-gray-500 whitespace-nowrap">
                    {new Date(ev.occurred_at).toLocaleString()}
                  </span>
                  <span className="capitalize font-medium">
                    {ev.status.replace('_', ' ')}
                  </span>
                  <span className="text-gray-600">{ev.description}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function InvoicePanel({ orderId }: { orderId: number }) {
  const { data: inv } = useQuery({
    queryKey: ['order-invoice', orderId],
    queryFn: () => getOrderInvoice(orderId)
  })
  if (!inv) return null
  return (
    <div className="bg-white rounded border p-3 flex items-center justify-between text-sm">
      <div>
        <div className="font-semibold">Invoice {inv.invoice_number}</div>
        <div className="text-gray-600">
          <span className="capitalize">{inv.status}</span> · Total{' '}
          {Number(inv.total).toLocaleString('en-US')} {inv.currency || ''}
        </div>
      </div>
      <button
        className="px-3 py-1 border rounded"
        onClick={() =>
          openInvoiceHtml(inv.id).catch(e => toast.error(errMsg(e)))
        }
      >
        View invoice
      </button>
    </div>
  )
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
      <ShipmentPanel orderId={oid} status={order.status} />
      <InvoicePanel orderId={oid} />
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
                    <span>
                      {name}
                      {(anyIt.variant?.name || anyIt.variant_name) && (
                        <span className="block text-xs text-gray-500">
                          {anyIt.variant?.name || anyIt.variant_name}
                        </span>
                      )}
                    </span>
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
