import { useMemo, useState } from 'react'
import {
  ShoppingCart,
  Truck,
  CreditCard,
  Trash2,
  Minus,
  Plus,
  Store,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useCart,
  useUpdateCartQuantity,
  useRemoveCartItem
} from '../hooks/useCart'
import { toast } from 'sonner'
import ConfirmModal from '../components/common/ConfirmModal'
import { makeProductSlug } from '../utils/productSlug'
import { groupCartItemsByShop } from '../utils/groupCartItemsByShop'
import {
  getExcluded,
  setExcluded,
  selectedItems,
  summarizeItems
} from '../utils/cartSelection'

const Check = ({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) => (
  <input
    type="checkbox"
    aria-label={label}
    checked={checked}
    onChange={e => onChange(e.target.checked)}
    className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
  />
)

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

  // Group items by shop - checkout will create one order per shop
  const groupedItems = useMemo(() => groupCartItemsByShop(items), [items])

  // Chon dong nao dem di thanh toan (luu o sessionStorage de Checkout doc lai)
  const [excluded, setExcludedState] = useState(getExcluded)
  const toggle = (ids: number[], on: boolean) => {
    const next = new Set(excluded)
    ids.forEach(id => (on ? next.delete(id) : next.add(id)))
    setExcluded(next)
    setExcludedState(next)
  }
  const available = items.filter(i => !i.unavailable)
  const chosen = selectedItems(items, excluded)
  const allChosen = available.length > 0 && chosen.length === available.length

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

  const { subtotal, discount, total: grandTotal } = summarizeItems(chosen)
  const chosenCount = chosen.reduce((n, i) => n + i.quantity, 0)
  const chosenShops = groupCartItemsByShop(chosen).length

  const isEmpty = !isLoading && items.length === 0
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
          <div className={`${isEmpty ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
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
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-4">Your cart is empty</p>
                <p className="text-sm text-gray-500 mt-1">
                  Browse products from verified shops and add them here.
                </p>
                <Link
                  to="/collection/all"
                  className="inline-block mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Continue shopping
                </Link>
              </div>
            ) : (
              <>
              {available.length > 0 && (
                <label className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 sm:px-6 py-3 text-sm font-medium text-gray-700 cursor-pointer">
                  <Check
                    label="Select all items"
                    checked={allChosen}
                    onChange={on => toggle(available.map(i => i.id), on)}
                  />
                  Select all ({available.length})
                </label>
              )}
              {groupedItems.map(group => {
                const groupAvailable = group.items.filter(i => !i.unavailable)
                const groupChosen = selectedItems(group.items, excluded)
                const shopTotal = summarizeItems(groupChosen).total
                return (
                  <section key={group.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Moi shop la mot don rieng khi checkout */}
                    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-100">
                      <span className="flex items-center gap-3 font-semibold text-gray-900 min-w-0">
                        {groupAvailable.length > 0 && (
                          <Check
                            label={`Select all from ${group.shopName}`}
                            checked={groupChosen.length === groupAvailable.length}
                            onChange={on => toggle(groupAvailable.map(i => i.id), on)}
                          />
                        )}
                        <Store className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">{group.shopName}</span>
                      </span>
                      {group.shopSlug && (
                        <Link
                          to={`/shop/${group.shopSlug}`}
                          className="flex items-center text-sm text-gray-500 hover:text-blue-600 shrink-0"
                        >
                          View shop <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </header>

                    <ul className="divide-y divide-gray-100">
                      {group.items.map(item => {
                        const hasDiscount = item.discount > 0
                        const imageUrl = item.image_url || ''
                        const colorName = item.color?.name || ''
                        const colorCode = item.color?.code || '#000000'
                        const productSlug = makeProductSlug(item.name, item.product_id)
                        if (item.unavailable) {
                          return (
                            <li key={item.id} className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4 opacity-70">
                              <span className="text-gray-700">{item.name}</span>
                              <button
                                onClick={() => handleRemove(item.product_id, item.id, item.name)}
                                className="text-sm text-red-600 underline"
                              >
                                No longer available — remove
                              </button>
                            </li>
                          )
                        }
                        return (
                          <li key={item.id} className="px-4 sm:px-6 py-4 flex items-start gap-3 sm:gap-4">
                            <span className="pt-8 sm:pt-10">
                              <Check
                                label={`Select ${item.name}`}
                                checked={!excluded.has(item.id)}
                                onChange={on => toggle([item.id], on)}
                              />
                            </span>
                            <Link
                              to={`/product/${productSlug}`}
                              className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden"
                            >
                              {imageUrl ? (
                                <img src={imageUrl} alt={item.name} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-xs text-gray-400">No image</span>
                              )}
                            </Link>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <Link
                                  to={`/product/${productSlug}`}
                                  className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                                >
                                  {item.name}
                                </Link>
                                <button
                                  onClick={() => handleRemove(item.product_id, item.id, item.name)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                                  title="Remove item"
                                  aria-label={`Remove ${item.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {(item.variant || colorName) && (
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                  {item.variant && (
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{item.variant.name}</span>
                                  )}
                                  {colorName && (
                                    <span className="flex items-center gap-1.5">
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-gray-300"
                                        style={{ backgroundColor: colorCode }}
                                      />
                                      {colorName}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-baseline gap-2">
                                  <span className={hasDiscount ? 'font-semibold text-blue-600' : 'font-semibold text-gray-900'}>
                                    ${item.final_price.toFixed(2)}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-sm text-gray-400 line-through">
                                      ${item.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center border border-gray-200 rounded-lg">
                                  <button
                                    onClick={() => handleDec(item.product_id, item.id, item.quantity)}
                                    disabled={item.quantity <= 1}
                                    aria-label="Decrease quantity"
                                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                                  <button
                                    onClick={() => handleInc(item.product_id, item.id, item.quantity, item.max_quantity)}
                                    disabled={item.quantity >= item.max_quantity}
                                    aria-label="Increase quantity"
                                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              {item.max_quantity > 0 && item.max_quantity <= 5 && (
                                <p className="mt-2 text-xs text-orange-600">Only {item.max_quantity} left</p>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    <footer className="flex justify-end items-baseline gap-2 px-4 sm:px-6 py-3 bg-gray-50 text-sm">
                      <span className="text-gray-500">Shop subtotal</span>
                      <span className="font-semibold text-gray-900">${shopTotal.toFixed(2)}</span>
                    </footer>
                  </section>
                )
              })}
              </>
            )}
          </div>

          {/* Right Section - Payment Details */}
          {!isEmpty && (
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
                <h2 className="text-xl font-bold mb-6">Order summary</h2>

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
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-sm">Calculated at checkout</span>
                  </div>
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
                  disabled={chosen.length === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Proceed to checkout ({chosenCount})
                  <Truck className="w-5 h-5" />
                </button>
                {chosenShops > 1 && (
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    Items from {chosenShops} shops ship as {chosenShops} separate orders.
                  </p>
                )}
                {chosen.length < available.length && (
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    Unselected items stay in your cart.
                  </p>
                )}
                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4" /> Secure checkout
                </p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Cart
