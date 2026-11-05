import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatUsd } from '../../utils/formatMoney'
import {
  fetchInvoice,
  fetchShipment,
  openInvoiceHtml
} from '../../services/orderService'

interface Order {
  id: number
  orderNumber?: string
  placedOn: string
  total: number
  delivered?: string
  sentTo: string
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

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex flex-col mb-10">
        <dl className="divide-y divide-gray-100 rounded-md">
          <div className="flex justify-between py-3 px-3 bg-gray-100 rounded-md">
            <dt className="text-black font-normal w-1/2">order code</dt>
            <dd className="text-gray-700 w-1/2 font-light text-left">
              {order.orderNumber || `#${order.id}`}
            </dd>
          </div>
          <div className="flex justify-between py-3 px-3">
            <dt className="text-black font-normal w-1/2">Placed on</dt>
            <dd className="text-gray-700 w-1/2 font-light text-left">
              {order.placedOn}
            </dd>
          </div>
          <div className="flex justify-between py-3 px-3 bg-gray-100 rounded-md">
            <dt className="text-black font-normal w-1/2">Sent to</dt>
            <dd className="text-gray-700 w-1/2 font-light text-left">
              {order.address}
            </dd>
          </div>
          <div className="flex justify-between py-3 px-3">
            <dt className="text-black font-normal w-1/2">Payment type</dt>
            <dd className="text-gray-700 w-1/2 font-light text-left">
              {order.paymentType || '—'}
            </dd>
          </div>
          <div className="flex justify-between py-3 px-3 bg-gray-100 rounded-md">
            <dt className="text-black font-normal w-1/2">Transaction id</dt>
            <dd className="text-gray-700 w-1/2 font-light text-left">
              {order.transactionId || '—'}
            </dd>
          </div>
          <div className="flex justify-between py-3 px-3">
            <dt className="text-black font-normal w-1/2">Amount Paid</dt>
            <dd className="text-gray-700 w-1/2 font-light text-left">
              {order.amountPaid !== undefined
                ? formatUsd(order.amountPaid)
                : formatUsd(order.total)}
            </dd>
          </div>
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
