import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '../../../lib/apiError'
import { formatPrice } from '../../utils/formatMoney'
import { orderDiscount, orderSubtotal } from '../../utils/orderMoney'
import {
  fetchShipment,
  openInvoiceHtml,
  reportNotReceived
} from '../../services/orderService'

interface Order {
  id: number
  orderNumber?: string
  placedOn: string
  total: number
  shippingFee?: number
  delivered?: string
  sentTo: string
  shopName?: string
  address?: string
  products: Product[]
  status?: 'processing' | 'on-the-way' | 'delivered' | string
  paymentType?: string
  transactionId?: string
  amountPaid?: number
  invoice?: { id: number; invoice_number: string } | null
}

interface Product {
  slug?: string
  name: string
  image?: string
  color?: { name: string; code: string }
  variant?: string
  quantity?: number
  price?: number
  originalPrice?: number
}

interface OrderDetail {
  order: Order
}

// Ma phuong thuc thanh toan -> nhan cho nguoi mua; ma la thi viet hoa tung tu
const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Cash on delivery',
  momo: 'MoMo',
  credit_card: 'Card',
  bank_transfer: 'Bank transfer'
}
const paymentLabel = (m?: string) =>
  m ? PAYMENT_LABEL[m] || m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : undefined

// Trang thai van don (ma carrier) -> nhan de hieu cho nguoi mua
const SHIPMENT_LABEL: Record<string, string> = {
  created: 'Order handed to carrier',
  picked: 'Parcel picked up',
  in_transit: 'On the way',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Delivery attempt failed',
  returned: 'Returned to seller',
  cancelled: 'Shipment cancelled'
}
const shipmentLabel = (s: string) => SHIPMENT_LABEL[s] || s.replace(/_/g, ' ')

const OrderDetails = ({ order }: OrderDetail) => {
  const { data: shipment } = useQuery({
    queryKey: ['shipment', order.id],
    queryFn: () => fetchShipment(order.id),
    retry: false
  })
  // Hoa don di kem danh sach don (GET /orders/user/orders), khong goi rieng nua
  const invoice = order.invoice
  const discount = orderDiscount(order)
  const [note, setNote] = useState('')
  const [reported, setReported] = useState(false)
  const report = useMutation({
    mutationFn: () => reportNotReceived(order.id, note.trim() || undefined),
    onSuccess: () => {
      setReported(true)
      toast.success('Thanks, our team will review this delivery')
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Failed to send report'))
  })

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6">
      <div className="flex flex-col mb-10">
        <dl className="rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
          {(
            [
              ['Order code', order.orderNumber || `#${order.id}`],
              ['Placed on', order.placedOn],
              ['Shop', order.shopName],
              ['Recipient', [order.sentTo, order.address].filter(Boolean).join(' · ')],
              ['Payment method', paymentLabel(order.paymentType)],
              ['Order total', formatPrice(order.amountPaid ?? order.total)]
            ] as [string, string | undefined][]
          )
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-gray-500">{k}</dt>
                <dd className="text-gray-900 text-right break-all">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      {shipment && (
        <div className="mb-8 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Shipment tracking</h3>
          <p className="text-sm text-gray-600">
            {/* carrier "mock" la carrier gia lap, nguoi mua chi can thay "Standard delivery" */}
            <span className="font-medium">
              {shipment.carrier && shipment.carrier !== 'mock' ? shipment.carrier : 'Standard delivery'}
            </span>
            {shipment.tracking_code && (
              <>
                {' '}
                · Tracking code: <span className="font-mono break-all">{shipment.tracking_code}</span>
              </>
            )}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Status: <span className="font-medium">{shipmentLabel(shipment.status)}</span>
          </p>
          {/* COD tren van don tinh bang VND cho carrier; nguoi mua thay tong don bang USD */}
          {shipment.cod_amount_vnd > 0 && (
            <p className="text-sm text-gray-600 mb-2">
              {shipment.status === 'delivered' ? 'Paid on delivery' : 'Cash to pay on delivery'}:{' '}
              <span className="font-medium">{formatPrice(order.amountPaid ?? order.total)}</span>
            </p>
          )}
          {shipment.events?.length > 0 && (
            <ol className="mt-4 space-y-4">
              {[...shipment.events]
                .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
                .map((ev, i) => (
                  <li key={ev.id} className="relative pl-6 text-sm">
                    {i < shipment.events.length - 1 && (
                      <span className="absolute left-[5px] top-4 -bottom-4 w-0.5 bg-gray-200" />
                    )}
                    <span
                      className={`absolute left-0 top-1 w-3 h-3 rounded-full ${
                        i === 0 ? 'bg-green-500 ring-4 ring-green-100' : 'bg-gray-300'
                      }`}
                    />
                    <p className={i === 0 ? 'font-medium text-gray-900' : 'text-gray-600'}>
                      {shipmentLabel(ev.status)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(ev.occurred_at).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </li>
                ))}
            </ol>
          )}
          {shipment.status === 'delivered' && (
            <div className="mt-4 border-t pt-3">
              {reported ? (
                <p className="text-sm text-green-700">Report sent. We will contact the carrier.</p>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="not-received-note" className="block text-sm text-gray-600">
                    Marked as delivered but you did not receive it?
                  </label>
                  <textarea
                    id="not-received-note"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Optional note"
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    disabled={report.isPending}
                    onClick={() => report.mutate()}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    I did not receive this order
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {invoice && (
        <button
          type="button"
          onClick={() =>
            openInvoiceHtml(invoice.id).catch(() =>
              toast.error('Failed to open invoice')
            )
          }
          className="mb-6 text-sm text-blue-600 hover:text-blue-700 underline"
        >
          View invoice {invoice.invoice_number}
        </button>
      )}

      <div className="space-y-4">
        {order.products.map((product, index) => {
          const priceVal =
            product.price !== undefined && product.price !== null
              ? Number(product.price)
              : undefined
          const originalVal =
            product.originalPrice !== undefined &&
            product.originalPrice !== null
              ? Number(product.originalPrice)
              : undefined
          return (
            <div
              key={`${product.name}-${index}`}
              className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-16 h-16 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-2xl overflow-hidden">
                  {typeof product.image === 'string' &&
                  product.image.startsWith('http') ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <span>{product.image || '🛒'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-normal line-clamp-2">{product.name}</p>
                  {product.variant && (
                    <p className="text-sm text-gray-500">{product.variant}</p>
                  )}
                  {product.color?.name && (
                    <p className="text-sm text-gray-500">{product.color.name}</p>
                  )}
                  {product.quantity && (
                    <p className="text-sm text-gray-500">
                      ×{product.quantity}
                      {priceVal !== undefined && !Number.isNaN(priceVal) && ` · ${formatPrice(priceVal)} each`}
                    </p>
                  )}
                  {order.status === 'delivered' && product.slug && (
                    <Link
                      to={`/product/${product.slug}#reviews`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Write review
                    </Link>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {originalVal !== undefined && !Number.isNaN(originalVal) && (
                  <p className="text-sm text-gray-400 line-through">
                    {formatPrice(originalVal)}
                  </p>
                )}
                {priceVal !== undefined && !Number.isNaN(priceVal) ? (
                  <p className="font-semibold">
                    {formatPrice(priceVal * (product.quantity ?? 1))}
                  </p>
                ) : (
                  <p className="font-semibold text-gray-500">—</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <dl className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Items subtotal</dt>
          <dd>{formatPrice(orderSubtotal(order))}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Shipping</dt>
          <dd>{formatPrice(order.shippingFee ?? 0)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <dt>Discount (voucher/tier)</dt>
            <dd>−{formatPrice(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </div>
  )
}

export default OrderDetails
