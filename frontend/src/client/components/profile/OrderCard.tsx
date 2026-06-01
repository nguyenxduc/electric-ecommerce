import { useState } from 'react'

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
  quantity?: number
  price?: number
  originalPrice?: number
}

interface OrderDetail {
  order: Order
  onClick?: () => void
}

const OrderCard = ({ order, onClick }: OrderDetail) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-4">
      <div className="flex flex-row mx-auto mb-4 bg-gray-100 p-5 rounded-md items-center justify-between">
        <div className="flex flex-col items-center justify-between">
          <p className="text-sm mb-1 font-semibold">order code</p>
          <p className="font-light">{order.orderNumber || `#${order.id}`}</p>
        </div>
        <div className="flex flex-col items-center justify-between">
          <p className="text-sm mb-1 font-semibold">Placed on</p>
          <p className="font-light">{order.placedOn}</p>
        </div>
        <div className="flex flex-col items-center justify-between">
          <p className="text-sm mb-1 font-semibold">Total</p>
          <p className="font-light">{order.total.toLocaleString('en-US')} </p>
        </div>
        {order.delivered && (
          <div className="flex flex-col items-center justify-between">
            <p className="text-sm mb-1 font-semibold">Delivered</p>
            <p className="font-light">{order.delivered}</p>
          </div>
        )}

        <div>
          {onClick && (
            <button
              onClick={onClick}
              className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-light"
            >
              Order Status
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {order.products.slice(0, 6).map((product, index) => {
          const isUrl =
            typeof product.image === 'string' &&
            /^https?:\/\//.test(product.image)
          return (
            <div
              key={index}
              className="w-20 h-20 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm overflow-hidden"
            >
              {isUrl ? (
                <img
                  src={product.image as string}
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
          )
        })}
        {order.products.length > 6 && (
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600">
            +{order.products.length - 6}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderCard
