import RemoveCart from '../../assets/remove-cart.svg'

import type { CartItem } from '../../types/cart'

interface CartProps {
  cartProducts: CartItem[]
}

const CartContent = ({ cartProducts }: CartProps) => {
  if (!cartProducts || cartProducts.length === 0) {
    return <div className="text-sm text-gray-500">No items in cart</div>
  }

  return (
    <div>
      {cartProducts.map((product, index) => {
        const imageUrl = product.image_url || ''
        const name = product.name || 'Unknown Product'
        const colorName = product.color?.name || ''
        const quantity = product.sold_quantity || product.quantity || 0
        const finalPrice =
          product.final_price || product.unit_final_price || product.price || 0

        return (
          <div
            key={product.id || index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="h-16 w-16 flex-shrink-0 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-xs text-gray-400">No image</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                {name}
              </h3>
              {colorName && (
                <p className="text-xs text-gray-500 mb-1">{colorName}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Qty: {quantity}</span>
                <span className="text-sm font-semibold text-gray-900">
                  ${finalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CartContent
