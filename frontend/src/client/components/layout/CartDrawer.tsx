import { useState } from 'react'
import CartContent from '../cart/CartContent'
import { useNavigate } from 'react-router-dom'

// @ts-ignore
import CartIcon from '../../../assets/cart-icon.svg'
// @ts-ignore
import EmptyCart from '../../../assets/empty-cart.png'
// @ts-ignore
import ProceedCart from '../../../assets/proceed-cart.svg'
import { Cart, CartItem } from '../../types/cart'

type ModalProps = {
  open: boolean
  onClose(): void
  cartItemCount: number
  totalCost: number
  cartProducts: CartItem[]
}

function Model({
  open,
  onClose,
  cartItemCount,
  totalCost,
  cartProducts
}: ModalProps) {
  const navigate = useNavigate()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 transition-colors bg-black/20"
      onClick={onClose}
    >
      <div
        className="fixed top-16 right-4 md:right-8 bg-white rounded-lg shadow-xl border border-gray-200 w-[90vw] max-w-[450px] max-h-[80vh] overflow-hidden transition-all transform"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Shopping Cart
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {cartItemCount ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                </p>
                <div className="space-y-3">
                  <CartContent cartProducts={cartProducts} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <img
                  src={EmptyCart}
                  alt="empty-cart"
                  className="w-24 h-24 mb-4 opacity-50"
                />
                <p className="text-gray-500 mb-2">Your cart is empty</p>
                <p className="text-sm text-gray-400">
                  Add some products to get started
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItemCount > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg font-semibold text-gray-900">
                  $
                  {typeof totalCost === 'number'
                    ? totalCost.toFixed(2)
                    : '0.00'}
                </span>
              </div>
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  navigate('/cart')
                  onClose()
                }}
              >
                View Cart
                <img src={ProceedCart} alt="proceed-cart" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface CartProps {
  cartProducts: Cart | null
}

const CartDrawer = ({ cartProducts }: CartProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (cartProducts) {
    console.log('Cart Products in Drawer:', cartProducts)
  } else {
    console.log('No cart products available')
  }

  return (
    <div className="">
      {drawerOpen && (
        <Model
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          cartItemCount={cartProducts ? cartProducts?.total_items : 0}
          totalCost={cartProducts ? cartProducts?.total_price : 0}
          cartProducts={cartProducts ? cartProducts?.items : []}
        />
      )}
      <button
        className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
        onClick={e => setDrawerOpen(!drawerOpen)}
      >
        <img src={CartIcon} alt="Cart" className="h-10 w-10" />
        {(cartProducts ? cartProducts?.total_items : 0) > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {cartProducts ? cartProducts?.total_items : 0}
          </span>
        )}
      </button>
    </div>
  )
}

export default CartDrawer
