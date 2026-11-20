import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatUsd } from '../../utils/formatMoney'
import {
  fetchInvoice,
  fetchShipment,
  openInvoiceHtml,
  reportNotReceived
} from '../../services/orderService'

interface Order {
  id: number
  orderNumber?: string
  placedOn: string
  total: number
  delivered?: string
  sentTo: string
  shopName?: string
  address?: string
  products: Product[]
  status?: 'processing' | 'on-the-way' | 'delivered' | string
  paymentType?: string
  transactionId?: string
  amountPaid?: number
}

interface Product {
  name: string
  image?: string
  color?: string
  variant?: string
  quantity?: number
  price?: number
  originalPrice?: number
}

interface OrderDetail {
  order: Order
}

// Ma phuong thuc thanh toan -> nhan cho nguoi mua
const PAYMENT_LABEL: Record<string, string> = { cod: 'Cash on delivery', momo: 'MoMo' }

const OrderDetails = ({ order }: OrderDetail) => {
  const { data: shipment } = useQuery({
    queryKey: ['shipment', order.id],
    queryFn: () => fetchShipment(order.id),
    retry: false
  })
  const { data: invoice } = useQuery({
    queryKey: ['invoice', order.id],
    queryFn: () => fetchInvoice(order.id),
    retry: false
  })
  const [note, setNote] = useState('')
  const [reported, setReported] = useState(false)
  const report = useMutation({
    mutationFn: () => reportNotReceived(order.id, note.trim() || undefined),
    onSuccess: () => {
      setReported(true)
      toast.success('Thanks, our team will review this delivery')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to send report')
  })

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex flex-col mb-10">
        <dl className="rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
          {(
            [
              ['Order code', order.orderNumber || `#${order.id}`],
              ['Placed on', order.placedOn],
              ['Shop', order.shopName],
              ['Recipient', [order.sentTo, order.address].filter(Boolean).join(' · ')],
              ['Payment method', PAYMENT_LABEL[order.paymentType || ''] || order.paymentType],
              ['Order total', formatUsd(order.amountPaid ?? order.total)]
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
            Carrier: <span className="font-medium">{shipment.carrier}</span>
            {shipment.tracking_code && (
              <>
                {' '}
                · Tracking code:{' '}
                <span className="font-mono">{shipment.tracking_code}</span>
              </>
            )}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Status: <span className="font-medium">{shipment.status}</span>
          </p>
          {shipment.cod_amount_vnd > 0 && (
            <p className="text-sm text-gray-600 mb-2">
              COD amount to pay on delivery:{' '}
              <span className="font-medium">
                {shipment.cod_amount_vnd.toLocaleString('vi-VN')}₫
              </span>
            </p>
          )}
          {shipment.events?.length > 0 && (
            <ol className="border-l-2 border-gray-200 ml-1 space-y-2 mt-3">
              {[...shipment.events]
                .sort(
                  (a, b) =>
                    new Date(b.occurred_at).getTime() -
                    new Date(a.occurred_at).getTime()
                )
                .map(ev => (
                  <li key={ev.id} className="pl-3 text-sm">
                    <span className="font-medium">{ev.status}</span>
                    {ev.description && ` - ${ev.description}`}
                    <span className="block text-xs text-gray-400">
                      {new Date(ev.occurred_at).toLocaleString('en-GB')}
                    </span>
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
              className="flex items-center justify-between border-b border-gray-100 pb-4"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl overflow-hidden">
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
                <div>
                  <p className="font-normal">{product.name}</p>
                  {product.variant && (
                    <p className="text-sm text-gray-500">{product.variant}</p>
                  )}
                  {product.color && (
                    <p className="text-sm text-gray-500">{product.color}</p>
                  )}
                  {product.quantity && (
                    <p className="text-sm text-gray-500">×{product.quantity}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {originalVal !== undefined && !Number.isNaN(originalVal) && (
                  <p className="text-sm text-gray-400 line-through">
                    {formatUsd(originalVal)}
                  </p>
                )}
                {priceVal !== undefined && !Number.isNaN(priceVal) ? (
                  <p className="font-semibold">
                    {formatUsd(priceVal)}
                  </p>
                ) : (
                  <p className="font-semibold text-gray-500">—</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OrderDetails
