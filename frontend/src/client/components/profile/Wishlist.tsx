import React, { useState } from 'react'
import { Heart, Trash2, ShoppingCart, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useWishlist,
  useRemoveFromWishlist,
  useClearWishlist
} from '../../hooks/useWishlist'
import { useAddToCart } from '../../hooks/useCart'
import ConfirmModal from '../common/ConfirmModal'
import { makeProductSlug } from '../../utils/productSlug'

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

  const formatPrice = (price: string, discount: string) => {
    const priceNum = parseFloat(price)
    const discountNum = parseFloat(discount)
    if (discountNum > 0) {
      const discountedPrice = priceNum - discountNum
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">
            ${discountedPrice.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500 line-through">
            ${priceNum.toFixed(2)}
          </span>
        </div>
      )
    }
    return (
      <span className="text-lg font-semibold text-gray-900">
        ${priceNum.toFixed(2)}
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

              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                >
                  <div
                    className="w-24 h-24 flex-shrink-0 cursor-pointer"
                    onClick={() => navigate(`/product/${productSlug}`)}
                  >
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-lg font-semibold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition"
                      onClick={() => navigate(`/product/${productSlug}`)}
                    >
                      {product.name}
                    </h3>
                    <div className="mb-2">
                      {formatPrice(product.price, product.discount)}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <button
                      onClick={() => handleRemove(productId, product.name)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition flex items-center gap-2"
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
