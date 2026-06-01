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
}

const OrderDetails = ({ order }: OrderDetail) => {
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
                ? `${Number(order.amountPaid).toLocaleString('en-US')} `
                : `${Number(order.total).toLocaleString('en-US')} `}
            </dd>
          </div>
        </dl>
      </div>

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
                    {originalVal.toLocaleString('en-US')}
                  </p>
                )}
                {priceVal !== undefined && !Number.isNaN(priceVal) ? (
                  <p className="font-semibold">
                    {priceVal.toLocaleString('en-US')}
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
