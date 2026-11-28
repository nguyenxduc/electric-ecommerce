import { useState } from 'react'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useWishlist,
  useRemoveFromWishlist,
  useClearWishlist
} from '../../hooks/useWishlist'
import { useAddToCart } from '../../hooks/useCart'
import { apiErrorMessage } from '../../../lib/apiError'
import type { WishlistItem } from '../../services/wishlistService'
import ConfirmModal from '../common/ConfirmModal'
import { makeProductSlug } from '../../utils/productSlug'
import { formatPrice } from '../../utils/formatMoney'

export default function Wishlist() {
  const navigate = useNavigate()
  const { data: wishlistData, isLoading } = useWishlist()
  const removeMutation = useRemoveFromWishlist()
  const clearMutation = useClearWishlist()
  const addToCartMutation = useAddToCart()
  const [pendingRemove, setPendingRemove] = useState<{
    id: number
    name: string
  } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const items = wishlistData?.items || []

  const handleRemove = (productId: number, productName: string) => {
    setPendingRemove({ id: productId, name: productName })
  }

  const confirmRemove = () => {
    if (!pendingRemove) return
    removeMutation.mutate(pendingRemove.id, {
      onSuccess: () => {
        toast.success('Removed from wishlist')
        setPendingRemove(null)
      },
      onError: () => {
        toast.error('Failed to remove item')
        setPendingRemove(null)
      }
    })
  }

  const handleClearWishlist = () => {
    clearMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Wishlist cleared')
        setShowClearConfirm(false)
      },
      onError: () => {
        toast.error('Failed to clear wishlist')
      }
    })
  }

  const handleAddToCart = (product: WishlistItem['product'], productSlug: string) => {
    // Can chon bien the/mau thi backend tu choi: mo trang san pham de nguoi mua chon
    // Chi mot mau (khong bien the) thi khong co gi de chon: them thang voi mau do
    const colors = product.product_colors ?? []
    if ((product._count?.variants ?? 0) > 0 || colors.length > 1) {
      toast.info('Choose an option for this product')
      navigate(`/product/${productSlug}`)
      return
    }
    const only = colors[0]
    addToCartMutation.mutate(
      {
        productId: parseInt(product.id),
        payload: { quantity: 1, color: only ? { name: only.name, code: only.code } : null }
      },
      {
        onSuccess: () => toast.success('Added to cart'),
        onError: err => toast.error(apiErrorMessage(err, 'Failed to add to cart'))
      }
    )
  }

  const renderPrice = (price: string, discount: string) => {
    const priceNum = parseFloat(price)
    const discountNum = parseFloat(discount)
    if (discountNum > 0) {
      const discountedPrice = priceNum - discountNum
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">
            {formatPrice(discountedPrice)}
          </span>
          <span className="text-sm text-gray-500 line-through">
            {formatPrice(priceNum)}
          </span>
        </div>
      )
    }
    return (
      <span className="text-lg font-semibold text-gray-900">
        {formatPrice(priceNum)}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-24 h-24 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={!!pendingRemove}
        title="Remove from wishlist?"
        description={
          pendingRemove
            ? `Remove "${pendingRemove.name}" from your wishlist?`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmRemove}
        onClose={() => setPendingRemove(null)}
        confirmClassName="bg-red-600 hover:bg-red-700"
      />
      <ConfirmModal
        open={showClearConfirm}
        title="Clear wishlist?"
        description="Are you sure you want to remove all items from your wishlist? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        onConfirm={handleClearWishlist}
        onClose={() => setShowClearConfirm(false)}
        confirmClassName="bg-red-600 hover:bg-red-700"
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Wishlist</h2>
            <p className="text-gray-500 mt-1">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Clear All
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-500 mb-6">
              Start adding products you love!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const product = item.product
              const productId = parseInt(product.id)
              const productSlug = makeProductSlug(product.name, productId)
              const mainImage =
                product.img && product.img.length > 0 ? product.img[0] : ''
              const priceNum = parseFloat(product.price)
              const discountNum = parseFloat(product.discount)
              const discountPct =
                priceNum > 0 && discountNum > 0
                  ? Math.round((discountNum / priceNum) * 100)
                  : 0
              const openProduct = () => navigate(`/product/${productSlug}`)

              return (
                <div
                  key={item.id}
                  role="link"
                  tabIndex={0}
                  onClick={openProduct}
                  onKeyDown={e => {
                    if (e.key === 'Enter') openProduct()
                  }}
                  className="flex cursor-pointer flex-wrap gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition sm:flex-nowrap"
                >
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {discountPct > 0 && (
                      <span className="absolute left-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 transition">
                      {product.name}
                    </h3>
                    <div className="mb-2">
                      {renderPrice(product.price, product.discount)}
                    </div>
                    {product.quantity <= 0 && (
                      <p className="text-sm text-red-500">Out of stock</p>
                    )}
                  </div>

                  <div
                    className="flex w-full gap-2 sm:w-auto sm:flex-col"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleAddToCart(product, productSlug)}
                      disabled={product.quantity <= 0 || addToCartMutation.isPending}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to cart</span>
                    </button>
                    <button
                      onClick={() => handleRemove(productId, product.name)}
                      className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
