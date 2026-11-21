import { useState } from 'react'
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
import { fmtDateTime } from '../../utils/date'
import { apiErrorMessage } from '../../../lib/apiError'
import { formatUsd } from '../../../client/utils/formatMoney'
import { USD_TO_VND_RATE } from '../../../client/utils/gatewayAmount'
import Modal from '../../components/common/Modal'

const errMsg = (e: unknown) => apiErrorMessage(e, 'Action failed')
// Van don luu VND; hien USD gan dung theo ty gia cau hinh
const vndAsUsd = (vnd: number | string | null | undefined) =>
  `≈ ${formatUsd(Number(vnd || 0) / USD_TO_VND_RATE)}`

const CANCEL_TEMPLATES = [
  'Out of stock',
  'Buyer requested cancellation',
  'Unable to ship to this address'
]
const TIMELINE = [
  { key: 'pending', label: 'Placed' },
  { key: 'processing', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' }
]

function StatusTimeline({ status }: { status: string }) {
  const reached = TIMELINE.findIndex(s => s.key === status)
  const ended = status === 'cancelled' || status === 'returned'
  return (
    <div className="bg-white rounded border p-3">
      <ol
        className="flex items-center gap-2 text-xs sm:text-sm overflow-x-auto"
        aria-label="Order status timeline"
      >
        {TIMELINE.map((s, i) => {
          const done = !ended && i <= reached
          return (
            <li key={s.key} className="flex items-center gap-2 shrink-0">
              <span
                className={`w-6 h-6 rounded-full grid place-items-center text-xs font-semibold ${
                  done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </span>
              <span className={done ? 'font-medium' : 'text-gray-500'}>
                {s.label}
              </span>
              {i < TIMELINE.length - 1 && <span className="w-6 h-px bg-gray-300" />}
            </li>
          )
        })}
        {ended && (
          <li className="shrink-0 px-2 py-0.5 rounded bg-red-100 text-red-700 capitalize">
            {status}
          </li>
        )}
      </ol>
    </div>
  )
}

function ShipmentPanel({
  orderId,
  status,
  awaitingPayment
}: {
  orderId: number
  status: string
  awaitingPayment: boolean
}) {
  const qc = useQueryClient()
  const { data: sh } = useQuery({
    queryKey: ['shipment', orderId],
    queryFn: () => getOrderShipment(orderId)
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['shipment', orderId] })
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    qc.invalidateQueries({ queryKey: ['order-invoice', orderId] })
  }
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
    onError: e => toast.error(errMsg(e))
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
            disabled={run.isPending || awaitingPayment}
            onClick={() => run.mutate(() => createShipment(orderId))}
          >
            Create shipment
          </button>
        )}
      </div>
      {canCreate && awaitingPayment && (
        <p className="text-xs text-gray-500">Available after the buyer pays</p>
      )}
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
              {vndAsUsd(sh.fee_vnd)}
              <div className="text-xs text-gray-400">
                {Number(sh.fee_vnd || 0).toLocaleString('vi-VN')} VND
              </div>
            </div>
            <div>
              <div className="text-gray-500">COD</div>
              {vndAsUsd(sh.cod_amount_vnd)}
              <div className="text-xs text-gray-400">
                {Number(sh.cod_amount_vnd || 0).toLocaleString('vi-VN')} VND
              </div>
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
            {['created', 'picking', 'failed'].includes(sh.status) && (
              <button
                className="px-3 py-1 border rounded text-red-600"
                disabled={run.isPending}
                onClick={() => run.mutate(() => cancelShipment(sh.id))}
              >
                Cancel shipment
              </button>
            )}
            {/* Chi nha van chuyen gia lap moi cho mo phong trang thai */}
            {sh.carrier === 'mock' && (
              <>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                  Demo
                </span>
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
              </>
            )}
          </div>
          {!!sh.events?.length && (
            <ul className="text-sm border-t pt-2 space-y-1">
              {sh.events.map(ev => (
                <li key={ev.id} className="flex flex-wrap gap-x-2">
                  <span className="text-gray-500 whitespace-nowrap">
                    {fmtDateTime(ev.occurred_at)}
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

function InvoicePanel({ orderId, status }: { orderId: number; status: string }) {
  // Hoa don chi sinh khi giao xong: khong goi truoc do de tranh 404 vo ich
  const { data: inv } = useQuery({
    queryKey: ['order-invoice', orderId],
    queryFn: () => getOrderInvoice(orderId),
    enabled: status === 'delivered' || status === 'returned'
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
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (isLoading) return <div className="p-6">Loading...</div>

  const order = data?.data
  if (!order) return null

  const addr = order.shipping_address || {}
  const receiverName = order.receiver_name || addr.name || '—'
  const receiverPhone = order.receiver_phone || addr.phone || '—'
  const street = typeof addr === 'string' ? addr : addr.address || addr.street
  const region =
    typeof addr === 'string'
      ? ''
      : [addr.ward, addr.district, addr.province || addr.city]
          .filter(Boolean)
          .join(', ')

  const subtotal = order.order_items.reduce(
    (sum, it) => sum + Number(it.total_price || 0),
    0
  )
  const shipping = Number(order.shipping_fee || 0)
  const total = Number(order.total_amount || 0)
  // Giam gia (voucher + hang thanh vien) = phan chenh lech, don khong luu rieng
  const discount = Math.max(
    0,
    Math.round((subtotal + shipping - total) * 100) / 100
  )

  const isOnline = !!order.payment_method && order.payment_method !== 'cod'
  const paid = !!order.order_group?.payments?.some(p => p.status === 'paid')
  const awaitingPayment = order.status === 'pending' && isOnline && !paid
  const canCancel = order.status === 'pending' || order.status === 'processing'

  const changeStatus = (status: 'processing' | 'cancelled', why?: string) =>
    update.mutate(
      { status, reason: why },
      {
        onSuccess: () => {
          toast.success(
            status === 'cancelled'
              ? 'Order cancelled'
              : 'Order confirmed - ready to ship'
          )
          setCancelOpen(false)
          setReason('')
        },
        onError: e => toast.error(errMsg(e))
      }
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Order{' '}
            {order.order_number ? `#${order.order_number}` : `#${order.id}`}
          </h1>
          <p className="text-sm text-gray-500">
            Created: {order.created_at ? fmtDateTime(order.created_at) : '—'}
            {' · '}
            <span className="capitalize">{order.status}</span>
          </p>
        </div>
        {/* Buoc tiep theo theo luong trang thai; giao hang do van don cap nhat */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'pending' && (
            <button
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
              disabled={update.isPending || awaitingPayment}
              title={
                awaitingPayment
                  ? 'The buyer has not paid this online order yet'
                  : undefined
              }
              onClick={() => changeStatus('processing')}
            >
              {awaitingPayment ? 'Awaiting payment' : 'Confirm order'}
            </button>
          )}
          {canCancel && (
            <button
              className="px-3 py-1.5 rounded border border-red-200 text-red-600 text-sm hover:bg-red-50"
              disabled={update.isPending}
              onClick={() => setCancelOpen(true)}
            >
              Cancel order
            </button>
          )}
          {order.status === 'shipped' && (
            <span className="text-sm text-gray-500">
              With the carrier - status follows shipment tracking
            </span>
          )}
        </div>
      </div>
      <StatusTimeline status={order.status} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded border p-3">
          <div className="text-sm text-gray-500">Customer</div>
          <div className="mt-1 text-sm break-words">
            {order.user?.name} ({order.user?.email})
          </div>
        </div>
        <div className="bg-white rounded border p-3">
          <div className="text-sm text-gray-500">Payment</div>
          <div className="mt-1 text-sm">
            {order.payment_method?.toUpperCase() || '—'}
            {isOnline && (
              <span
                className={`ml-2 text-xs ${paid ? 'text-green-700' : 'text-amber-600'}`}
              >
                {paid ? 'Paid' : 'Unpaid'}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white rounded border p-3 text-sm">
          <div className="text-gray-500">Shipping address</div>
          <div className="mt-1 font-medium">{receiverName}</div>
          <div className="text-gray-600">{receiverPhone}</div>
          {street && <div>{street}</div>}
          {region && <div className="text-gray-600">{region}</div>}
        </div>
      </div>
      <ShipmentPanel
        orderId={oid}
        status={order.status}
        awaitingPayment={awaitingPayment}
      />
      <InvoicePanel orderId={oid} status={order.status} />
      <div className="bg-white rounded border">
        <div className="overflow-x-auto">
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
                const name = it.product?.name || `#${it.product_id}`
                const img =
                  (Array.isArray(it.product?.img) && it.product?.img?.[0]) ||
                  it.product?.image_url
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
                        {(it.variant?.name || it.variant_name) && (
                          <span className="block text-xs text-gray-500">
                            {it.variant?.name || it.variant_name}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-2">{it.quantity}</td>
                    <td className="p-2">{formatUsd(it.unit_price)}</td>
                    <td className="p-2">{formatUsd(it.total_price)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <dl className="border-t p-3 text-sm space-y-1 ml-auto max-w-xs">
          <div className="flex justify-between">
            <dt className="text-gray-500">Subtotal</dt>
            <dd>{formatUsd(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Shipping</dt>
            <dd>{formatUsd(shipping)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Discounts</dt>
              <dd className="text-green-700">-{formatUsd(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-1">
            <dt>Total</dt>
            <dd>{formatUsd(total)}</dd>
          </div>
        </dl>
      </div>
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel order"
        variant="danger"
        footer={
          <>
            <button
              className="px-3 py-1.5 text-sm border rounded"
              onClick={() => setCancelOpen(false)}
            >
              Keep order
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded bg-red-600 text-white disabled:opacity-50"
              disabled={update.isPending || reason.trim().length < 5}
              onClick={() => changeStatus('cancelled', reason.trim())}
            >
              Confirm cancel
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <label htmlFor="cancel-reason" className="text-sm font-medium">
            Reason for cancelling
          </label>
          <textarea
            id="cancel-reason"
            className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {CANCEL_TEMPLATES.map(t => (
              <button
                key={t}
                type="button"
                className="px-2 py-1 text-xs border rounded-full hover:bg-gray-50"
                onClick={() => setReason(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">At least 5 characters.</p>
        </div>
      </Modal>
    </div>
  )
}
