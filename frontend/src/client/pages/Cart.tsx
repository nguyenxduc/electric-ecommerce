import React, { useMemo, useState } from 'react'
import {
  ShoppingCart,
  Truck,
  CreditCard,
  Trash2,
  Minus,
  Plus,
  Check,
  Package
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useCart,
  useUpdateCartQuantity,
  useRemoveCartItem
} from '../hooks/useCart'
import { toast } from 'sonner'
import ConfirmModal from '../components/common/ConfirmModal'
import { makeProductSlug } from '../utils/productSlug'
const Cart = () => {
  const navigate = useNavigate()
  const { data: cartData, isLoading } = useCart()
  const updateQuantityMutation = useUpdateCartQuantity()
  const removeItemMutation = useRemoveCartItem()
  const [pendingRemove, setPendingRemove] = useState<{
    id: number
    cartItemId: number
    name: string
  } | null>(null)

  const cart = cartData?.cart
  const items = cart?.items || []

  const handleInc = (
    productId: number,
    cartItemId: number,
    currentQuantity: number,
    maxQuantity: number
  ) => {
    if (currentQuantity >= maxQuantity) {
      toast.error('Maximum quantity reached')
      return
    }
    updateQuantityMutation.mutate(
      { productId, cartItemId, quantity: currentQuantity + 1 },
      {
        onSuccess: () => {
          toast.success('Quantity updated')
        },
        onError: () => {
          toast.error('Failed to update quantity')
        }
      }
    )
  }

  const handleDec = (
    productId: number,
    cartItemId: number,
    currentQuantity: number
  ) => {
    if (currentQuantity > 1) {
      updateQuantityMutation.mutate(
        { productId, cartItemId, quantity: currentQuantity - 1 },
        {
          onSuccess: () => {
            toast.success('Quantity updated')
          },
          onError: () => {
            toast.error('Failed to update quantity')
          }
        }
      )
    }
  }

  const handleRemove = (
    productId: number,
    cartItemId: number,
    productName: string
  ) => {
    setPendingRemove({ id: productId, name: productName, cartItemId })
  }

  const confirmRemove = () => {
    if (!pendingRemove) return
    removeItemMutation.mutate(
      { productId: pendingRemove.id, cartItemId: pendingRemove.cartItemId },
      {
        onSuccess: () => {
          toast.success('Item removed from cart')
          setPendingRemove(null)
        },
        onError: () => {
          toast.error('Failed to remove item')
          setPendingRemove(null)
        }
      }
    )
  }

  const subtotal = cart?.total_original_price || 0
  const discount = cart?.total_discount || 0
  const grandTotal = cart?.total_price || 0

  const skeletonItems = useMemo(() => Array.from({ length: 3 }), [])

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <ConfirmModal
        open={!!pendingRemove}
        title="Remove item?"
        description={
          pendingRemove ? `Remove "${pendingRemove.name}" from your cart?` : ''
        }
        confirmText="Remove"
        cancelText="Keep"
        tone="danger"
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center w-full max-w-md">
              {/* Cart Step */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mb-2">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-blue-600">Cart</span>
              </div>

              {/* Line */}
              <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>

              {/* Checkout Step */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <Truck className="w-6 h-6 text-gray-500" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Checkout
                </span>
              </div>

              {/* Line */}
              <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>

              {/* Payment Step */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <CreditCard className="w-6 h-6 text-gray-500" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Payment
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading && (
              <div className="space-y-4">
                {skeletonItems.map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg shadow p-6 animate-pulse"
                  >
                    <div className="flex gap-6">
                      <div className="w-32 h-32 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="flex gap-3">
                          <div className="h-8 w-24 bg-gray-200 rounded" />
                          <div className="h-8 w-24 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && items.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-lg text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              items.map(item => {
                const hasDiscount = item.discount > 0
                const imageUrl = item.image_url || ''
                const colorName = item.color?.name || ''
                const colorCode = item.color?.code || '#000000'
                const productId = item.product_id
                const productSlug = makeProductSlug(item.name, productId)
                return (
                  <div key={item.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="w-full h-full object-contain cursor-pointer"
                              onClick={() =>
                                navigate(`/product/${productSlug}`)
                              }
                            />
                          ) : (
                            <div className="text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-3 truncate">
                          {item.name}
                        </h3>

                        {/* Color and Badges */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          {colorName && (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: colorCode }}
                              />
                              <span className="text-sm text-gray-600">
                                {colorName}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <Truck className="w-4 h-4" />
                            <span>Free Delivery</span>
                          </div>

                          {item.quantity > 0 && (
                            <div className="flex items-center gap-1 text-sm text-blue-600">
                              <Package className="w-4 h-4" />
                              <span>In Stock</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <Check className="w-4 h-4" />
                            <span>Guaranteed</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-4">
                          {hasDiscount ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold text-blue-600">
                                ${item.final_price.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-400 line-through">
                                ${item.price.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-semibold">
                              ${item.final_price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() =>
                              handleRemove(item.product_id, item.id, item.name)
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>

                          <div className="flex items-center gap-3 border border-gray-300 rounded-lg">
                            <button
                              onClick={() =>
                                handleDec(
                                  item.product_id,
                                  item.id,
                                  item.quantity
                                )
                              }
                              disabled={item.quantity <= 1}
                              className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleInc(
                                  item.product_id,
                                  item.id,
                                  item.quantity,
                                  item.max_quantity
                                )
                              }
                              disabled={item.quantity >= item.max_quantity}
                              className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Right Section - Payment Details */}
          <div className="lg:col-span-1">
            {isLoading ? (
              <div className="bg-white rounded-lg shadow p-6 sticky top-8 animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-4/6" />
                </div>
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-6">Payment Details</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Grand Total</span>
                    <span className="text-xl font-bold text-blue-600">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  disabled={items.length === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Proceed to checkout
                  <Truck className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
