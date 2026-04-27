import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useAddToCart } from '../../hooks/useCart'
import {
  useAddToWishlist,
  useRemoveFromWishlist,
  useWishlist
} from '../../hooks/useWishlist'
import { useValidateToken } from '../../hooks/useAuth'

interface ProductProps {
  discount: number
  price: number
  final_price?: number // Add final_price from backend
  discount_percentage?: number // Add discount_percentage from backend
  selectedColor: string
  colors: { name: string; code: string; quantity?: number }[]
  id: number
  quantity: number // total (fallback)
}

const Payment = ({
  discount,
  price,
  final_price,
  discount_percentage,
  selectedColor,
  colors,
  id,
  quantity
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
  const finalPrice =
    final_price !== undefined
      ? Number(final_price)
      : Number(price) - Number(discount)

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
  const selectedQty = selectedColorObj?.quantity ?? quantity

  const handleAddToCart = () => {
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
          quantity: 1,
          color: colorPayload
        }
      },
      {
        onSuccess: () => {
          toast.success('Added to cart successfully')
        },
        onError: (err: any) => {
          console.error('Add to cart error:', err)
          const errorMessage =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Failed to add to cart. Please try again.'
          toast.error(errorMessage)
        }
      }
    )
  }

  const handleBuyNow = async () => {
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
          quantity: 1,
          color: colorPayload
        }
      },
      {
        onSuccess: () => {
          toast.success('Redirecting to checkout...')
          navigate('/checkout')
        },
        onError: (err: any) => {
          console.error('Buy now error:', err)
          const errorMessage =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Failed to proceed. Please try again.'
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
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || 'Failed to remove from wishlist'
          )
        }
      })
    } else {
      addToWishlistMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Added to wishlist')
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || 'Failed to add to wishlist'
          )
        }
      })
    }
  }

  return (
    <div className="sticky top-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 max-w-[400px] w-full">
        {/* Price Section */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-gray-900">
                ${finalPrice.toFixed(2)}
              </h2>
              {discountPercent > 0 && (
                <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  -{discountPercent}%
                </span>
              )}
            </div>
          </div>
          {discountPercent > 0 && (
            <p className="text-sm text-gray-500 line-through">
              ${Number(price).toFixed(2)}
            </p>
          )}
        </div>

        {/* Stock Status */}
        <div className="mb-6">
          {quantity > 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm font-medium">In Stock</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <span className="text-sm font-medium">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleBuyNow}
            disabled={quantity <= 0 || addToCartMutation.isPending}
            className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-lg font-semibold transition-all ${
              quantity > 0 && !addToCartMutation.isPending
                ? 'hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <Zap className="w-5 h-5" />
            {addToCartMutation.isPending ? 'Processing...' : 'Buy Now'}
          </button>

          <button
            onClick={handleAddToCart}
            disabled={quantity <= 0 || addToCartMutation.isPending}
            className={`w-full flex items-center justify-center gap-2 bg-white text-blue-600 py-3.5 rounded-lg font-semibold border-2 border-blue-600 transition-all ${
              quantity > 0 && !addToCartMutation.isPending
                ? 'hover:bg-blue-50 hover:border-blue-700'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
          </button>

          <button
            onClick={handleToggleWishlist}
            disabled={
              !userData?.user ||
              addToWishlistMutation.isPending ||
              removeFromWishlistMutation.isPending
            }
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold border-2 transition-all ${
              isInWishlist
                ? 'bg-red-600 text-white border-none hover:bg-red-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } ${!userData?.user ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart
              className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`}
            />
            {addToWishlistMutation.isPending ||
            removeFromWishlistMutation.isPending
              ? 'Processing...'
              : isInWishlist
              ? 'Added to Wishlist'
              : 'Add to Wishlist'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Payment
