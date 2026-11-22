import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart, Zap, Minus, Plus, Truck, ShieldCheck, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAddToCart } from '../../hooks/useCart'
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlist
} from '../../hooks/useWishlist'
import { useValidateToken } from '../../hooks/useAuth'
import { apiErrorMessage } from '../../../lib/apiError'
import type { ProductVariant } from '../../types/product'
import { fetchCart } from '../../services/cartService'
import { setExcluded } from '../../utils/cartSelection'

interface ProductProps {
  discount: number
  price: number
  final_price?: number // Add final_price from backend
  discount_percentage?: number // Add discount_percentage from backend
  selectedColor: string
  colors: { name: string; code: string; quantity?: number }[]
  id: number
  quantity: number // total (fallback)
  variants?: ProductVariant[]
  selectedVariant?: ProductVariant | null
}

const Payment = ({
  discount,
  price,
  final_price,
  discount_percentage,
  selectedColor,
  colors,
  id,
  quantity,
  variants = [],
  selectedVariant = null
}: ProductProps) => {
  const navigate = useNavigate()
  const addToCartMutation = useAddToCart()
  const addToWishlistMutation = useAddToWishlist()
  const removeFromWishlistMutation = useRemoveFromWishlist()
  const { data: wishlistData } = useWishlist()
  const { data: userData } = useValidateToken()

  const isInWishlist = useMemo(() => {
    if (!wishlistData?.items || !Array.isArray(wishlistData.items)) {
      return false
    }

    return wishlistData.items.some(item => {
      const itemProductId = item.product.id
      const currentProductId = id.toString()

      // Try different comparison methods to be safe
      return (
        itemProductId === currentProductId || parseInt(itemProductId) === id
      )
    })
  }, [wishlistData?.items, id])

  // Use final_price from backend if available, otherwise calculate
  const hasVariants = variants.length > 0
  const priceDelta = Number(selectedVariant?.price_delta ?? 0)
  const finalPrice =
    (final_price !== undefined
      ? Number(final_price)
      : Number(price) - Number(discount)) + priceDelta

  // Use discount_percentage from backend if available, otherwise calculate
  const discountPercent =
    discount_percentage !== undefined
      ? Number(discount_percentage)
      : Number(price) > 0
      ? Math.round((Number(discount) / Number(price)) * 100)
      : 0

  const selectedColorObj = useMemo(
    () =>
      colors.find(c => c.name === selectedColor) ||
      (colors.length ? colors[0] : undefined),
    [colors, selectedColor]
  )
  const selectedQty = hasVariants
    ? selectedVariant?.quantity ?? 0
    : selectedColorObj?.quantity ?? quantity
  const needsVariant = hasVariants && !selectedVariant
  const canBuy = hasVariants ? !!selectedVariant && selectedQty > 0 : quantity > 0
  const [qty, setQty] = useState(1)
  // Thanh mua hang dinh day tren mobile: bao cho cac nut chat noi nhuong cho
  useEffect(() => {
    document.body.classList.add('has-bottom-bar')
    return () => document.body.classList.remove('has-bottom-bar')
  }, [])
  // Doi bien the co ton thap hon thi tu ha so luong
  const buyQty = Math.max(1, Math.min(qty, selectedQty || 1))

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a variant')
      document.getElementById('variant-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (selectedQty <= 0) {
      toast.error('Selected color is out of stock')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      toast.error('Please login to add to cart')
      return
    }

    const colorPayload =
      selectedColorObj && selectedColorObj.name ? selectedColorObj : null

    addToCartMutation.mutate(
      {
        productId: id,
        payload: {
          quantity: buyQty,
          color: colorPayload,
          variant_id: selectedVariant?.id
        }
      },
      {
        onSuccess: () => {
          toast.success('Added to cart successfully')
        },
        onError: (err: unknown) => {
          console.error('Add to cart error:', err)
          const errorMessage = apiErrorMessage(
            err,
            err instanceof Error ? err.message : 'Failed to add to cart. Please try again.'
          )
          toast.error(errorMessage)
        }
      }
    )
  }

  const handleBuyNow = async () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Please select a variant')
      document.getElementById('variant-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (selectedQty <= 0) {
      toast.error('Selected color is out of stock')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      toast.error('Please login to buy')
      return
    }

    const colorPayload =
      selectedColorObj && selectedColorObj.name ? selectedColorObj : null

    // Add to cart first, then navigate to checkout
    addToCartMutation.mutate(
      {
        productId: id,
        payload: {
          quantity: buyQty,
          color: colorPayload,
          variant_id: selectedVariant?.id
        }
      },
      {
        onSuccess: async () => {
          // Mua ngay = chi thanh toan dong nay (dong gop vao dong cu van giu id cu)
          try {
            const { cart } = await fetchCart()
            const bought = cart.items.find(
              i =>
                i.product_id === id &&
                (i.variant?.id ?? null) === (selectedVariant?.id ?? null) &&
                (!colorPayload?.name || i.color?.name === colorPayload.name)
            )
            if (bought) {
              setExcluded(new Set(cart.items.filter(i => i.id !== bought.id).map(i => i.id)))
            }
          } catch {
            // khong doc duoc gio: checkout dung lua chon hien co
          }
          toast.success('Redirecting to checkout...')
          navigate('/checkout')
        },
        onError: (err: unknown) => {
          console.error('Buy now error:', err)
          const errorMessage = apiErrorMessage(
            err,
            err instanceof Error ? err.message : 'Failed to proceed. Please try again.'
          )
          toast.error(errorMessage)
        }
      }
    )
  }

  const handleToggleWishlist = () => {
    if (!userData?.user) {
      toast.error('Please login to add to wishlist')
      return
    }

    if (isInWishlist) {
      removeFromWishlistMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Removed from wishlist')
        },
        onError: (err: unknown) => {
          toast.error(apiErrorMessage(err, 'Failed to remove from wishlist'))
        }
      })
    } else {
      addToWishlistMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Added to wishlist')
        },
        onError: (err: unknown) => {
          toast.error(apiErrorMessage(err, 'Failed to add to wishlist'))
        }
      })
    }
  }

  return (
    <div>
      <div className="bg-white rounded-3xl ring-1 ring-gray-200/70 p-6 w-full">
        {/* Price Section */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <h2 className="price text-3xl font-extrabold text-ink">
                ${finalPrice.toFixed(2)}
              </h2>
              {discountPercent > 0 && (
                <span className="price text-sm font-semibold text-sale-700 bg-sale-50 px-2 py-0.5 rounded-full">
                  -{discountPercent}%
                </span>
              )}
            </div>
          </div>
          {discountPercent > 0 && (
            <p className="price text-sm text-gray-500 line-through">
              ${(Number(price) + priceDelta).toFixed(2)}
            </p>
          )}
        </div>

        {/* Quantity + stock */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="inline-flex items-center border border-gray-200 rounded-lg">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty(Math.max(1, buyQty - 1))}
              disabled={!canBuy || buyQty <= 1}
              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium" aria-live="polite">{buyQty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty(Math.min(selectedQty, buyQty + 1))}
              disabled={!canBuy || buyQty >= selectedQty}
              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {hasVariants && !selectedVariant ? (
            <span className="text-sm text-gray-500">
              Select a variant to see stock
            </span>
          ) : selectedQty > 0 ? (
            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
              <span className="w-2 h-2 bg-green-600 rounded-full" />
              {selectedQty} in stock
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-red-600">
              <span className="w-2 h-2 bg-red-600 rounded-full" />
              Out of Stock
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleBuyNow}
            disabled={!canBuy || addToCartMutation.isPending}
            className={`w-full flex items-center justify-center gap-2 bg-ink text-white py-3.5 rounded-full font-semibold ${
              canBuy && !addToCartMutation.isPending
                ? 'hover:bg-brand-800'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <Zap className="w-5 h-5" />
            {addToCartMutation.isPending ? 'Processing…' : 'Buy Now'}
          </button>

          <button
            onClick={handleAddToCart}
            disabled={!canBuy || addToCartMutation.isPending}
            className={`w-full flex items-center justify-center gap-2 bg-white text-ink py-3.5 rounded-full font-semibold border-2 border-ink ${
              canBuy && !addToCartMutation.isPending
                ? 'hover:bg-gray-50'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {addToCartMutation.isPending ? 'Adding…' : 'Add to Cart'}
          </button>

          <button
            onClick={handleToggleWishlist}
            disabled={
              !userData?.user ||
              addToWishlistMutation.isPending ||
              removeFromWishlistMutation.isPending
            }
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Heart
              className={`w-4 h-4 ${isInWishlist ? 'fill-red-600 text-red-600' : ''}`}
            />
            {isInWishlist ? 'Saved to wishlist' : 'Add to wishlist'}
          </button>
          {/* Backend bao "Price drop on your wishlist" khi gia ban thuc te giam */}
          <p className="text-center text-xs text-gray-500" aria-live="polite">
            {isInWishlist ? "We'll notify you if the price drops." : 'Save it to get a price-drop alert.'}
          </p>
        </div>

        {/* Delivery + buyer protection */}
        <ul className="mt-6 pt-6 border-t border-gray-200 space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <Truck className="w-5 h-5 text-gray-400 shrink-0" />
            <span>Shipping fee and delivery estimate shown at checkout</span>
          </li>
          <li className="flex gap-3">
            <BadgeCheck className="w-5 h-5 text-gray-400 shrink-0" />
            <span>Sold by a seller verified by the marketplace</span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-gray-400 shrink-0" />
            <span>Secure checkout, order tracked until delivery</span>
          </li>
        </ul>
      </div>

      {/* Mobile: thanh mua dinh day nhu cac app san */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="min-w-0">
          {needsVariant ? (
            <p className="text-sm font-semibold text-gray-700 leading-tight">Select options</p>
          ) : (
            <>
              <p className="price text-lg font-bold text-ink leading-tight">${(finalPrice * buyQty).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Qty {buyQty}</p>
            </>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={(!canBuy && !(hasVariants && !selectedVariant)) || addToCartMutation.isPending}
          aria-label="Add to cart"
          className="ml-auto flex items-center justify-center w-12 h-11 rounded-full border-2 border-ink text-ink disabled:opacity-50"
        >
          <ShoppingCart className="w-5 h-5" />
        </button>
        <button
          onClick={handleBuyNow}
          disabled={(!canBuy && !(hasVariants && !selectedVariant)) || addToCartMutation.isPending}
          className="h-11 px-6 rounded-full bg-ink text-white font-semibold disabled:opacity-50"
        >
          {needsVariant ? 'Select options' : 'Buy now'}
        </button>
      </div>
    </div>
  )
}

export default Payment
