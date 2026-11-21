import { Link } from 'react-router-dom'
import { Store, ChevronRight, MessageCircle } from 'lucide-react'
import { formatUsd } from '../../utils/formatMoney'
import { orderDiscount } from '../../utils/orderMoney'

interface Order {
  id: number
  orderNumber?: string
  shopName?: string
  shopSlug?: string
  groupNumber?: string
  placedOn: string
  total: number
  shippingFee?: number
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
  slug?: string
  name: string
  image?: string
  color?: { name: string; code: string }
  quantity?: number
  price?: number
  originalPrice?: number
  variant?: string
}

interface OrderDetail {
  order: Order
  onClick?: () => void
  onContact?: () => void
  onBuyAgain?: () => void
  buyingAgain?: boolean
  onPayNow?: () => void
  paying?: boolean
}

// Nhan trang thai theo ngon ngu nguoi mua (giong tab "To ship / Shipping" cua app san)
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'To ship', cls: 'text-blue-600' },
  processing: { label: 'To ship', cls: 'text-blue-600' },
  shipped: { label: 'To receive', cls: 'text-indigo-600' },
  delivered: { label: 'Completed', cls: 'text-green-600' },
  cancelled: { label: 'Cancelled', cls: 'text-gray-500' },
  returned: { label: 'Returned', cls: 'text-rose-600' }
}

const isUrl = (v?: string) => typeof v === 'string' && /^https?:\/\//.test(v)

const OrderCard = ({ order, onClick, onContact, onBuyAgain, buyingAgain, onPayNow, paying }: OrderDetail) => {
  // Don online pending la dang cho thanh toan
  const st =
    order.status === 'pending' && order.paymentType && order.paymentType !== 'cod'
      ? { label: 'To pay', cls: 'text-amber-600' }
      : STATUS[order.status || ''] || { label: order.status || '', cls: 'text-gray-600' }
  const reviewSlug = order.status === 'delivered' ? order.products.find(p => p.slug)?.slug : undefined
  const shown = order.products.slice(0, 2)
  const more = order.products.length - shown.length
  const itemCount = order.products.reduce((n, p) => n + (p.quantity || 1), 0)
  const discount = orderDiscount(order)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-100">
        <span className="flex items-center gap-2 min-w-0 text-sm font-semibold text-gray-900">
          <Store className="w-4 h-4 text-blue-600 shrink-0" />
          {order.shopSlug ? (
            <a href={`/shop/${order.shopSlug}`} className="truncate hover:text-blue-600">
              {order.shopName}
            </a>
          ) : (
            <span className="truncate">{order.shopName || 'Order'}</span>
          )}
        </span>
        <span className={`text-sm font-semibold shrink-0 ${st.cls}`}>{st.label}</span>
      </div>

      <ul className="divide-y divide-gray-50">
        {shown.map((product, index) => (
          <li key={index} className="flex gap-3 px-4 sm:px-5 py-3">
            <div className="w-16 h-16 shrink-0 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center">
              {isUrl(product.image) ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <span className="text-2xl">{product.image || '🛒'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 line-clamp-2">{product.name}</p>
              {product.variant && <p className="text-xs text-gray-500 mt-0.5">{product.variant}</p>}
              <p className="text-xs text-gray-500 mt-0.5">
                x{product.quantity ?? 1}
                {product.price != null && ` · ${formatUsd(Number(product.price))} each`}
              </p>
            </div>
            {product.price != null && (
              <span className="text-sm font-medium text-gray-900 shrink-0">
                {formatUsd(Number(product.price) * (product.quantity ?? 1))}
              </span>
            )}
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="px-4 sm:px-5 pb-2 text-xs text-gray-500">+{more} more item{more > 1 ? 's' : ''}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {order.orderNumber || `#${order.id}`} · {order.placedOn}
        </span>
        <span className="text-sm text-gray-600">
          {discount > 0 && <span className="mr-2 text-green-600">Discount −{formatUsd(discount)}</span>}
          {itemCount} item{itemCount > 1 ? 's' : ''}:{' '}
          <span className="font-semibold text-rose-600">{formatUsd(order.total)}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-100">
        {onContact && (
          <button
            onClick={onContact}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          >
            <MessageCircle className="w-4 h-4" /> Contact shop
          </button>
        )}
        {reviewSlug && (
          <Link
            to={`/product/${reviewSlug}#reviews`}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          >
            Write review
          </Link>
        )}
        {onBuyAgain && (
          <button
            onClick={onBuyAgain}
            disabled={buyingAgain}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {buyingAgain ? 'Adding...' : 'Buy again'}
          </button>
        )}
        {onPayNow && (
          <button
            onClick={onPayNow}
            disabled={paying}
            className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
          >
            {paying ? 'Redirecting...' : 'Pay now'}
          </button>
        )}
        {onClick && (
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          >
            View details <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default OrderCard
