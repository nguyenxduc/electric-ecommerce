import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { trackBehavior } from '../../services/behaviorService'
import type { Product } from '../../types/product'

interface ProductCardProps {
  product: Product
  slug?: string
  compareSelected?: boolean
  compareDisabled?: boolean
  compareDisabledReason?: string
  onCompareToggle?: (product: Product) => void
}

const asNumber = (value: unknown, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const ProductCard = ({
  product,
  slug,
  compareSelected = false,
  compareDisabled = false,
  compareDisabledReason,
  onCompareToggle
}: ProductCardProps) => {
  const navigate = useNavigate()
  const price = asNumber(product.price)
  const finalPrice = asNumber(product.final_price)
  const discount = asNumber(product.discount)
  const rating = asNumber(product.rating)
  const discountPercentageValue = Number(product.discount_percentage)

  // Calculate discount percentage if not provided
  const discountPercentage =
    Number.isFinite(discountPercentageValue)
      ? discountPercentageValue
      : price > 0
      ? Math.round((discount / price) * 100)
      : 0

  const hasDiscount = discountPercentage > 0

  return (
    <div
      className="relative bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => {
        trackBehavior('click', product.id, { source: 'product_card' })
        navigate(`/product/${slug || product.id}`)
      }}
    >
      {onCompareToggle && (
        <button
          type="button"
          disabled={compareDisabled && !compareSelected}
          onClick={event => {
            event.stopPropagation()
            onCompareToggle(product)
          }}
          className={`absolute top-3 right-3 z-20 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none ${
            compareSelected
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
          } ${compareDisabled && !compareSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={
            compareDisabled && !compareSelected
              ? compareDisabledReason || 'This product cannot be compared'
              : compareSelected
              ? 'Remove from comparison'
              : 'Add to comparison'
          }
        >
          {compareSelected ? 'Selected' : 'Compare'}
        </button>
      )}

      <div className="relative mb-4">
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-orange-200 text-orange-800 text-xs font-semibold px-2 py-1 rounded z-10">
            -{discountPercentage}%
          </div>
        )}
        <div className="w-full h-48 bg-gray-50 rounded-lg overflow-hidden">
          {product.img && product.img.length > 0 ? (
            <img
              src={product.img[0]}
              alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No image
            </div>
          )}
        </div>
      </div>
      <h3 className="text-sm text-gray-700 mb-2 truncate">{product.name}</h3>
      {product.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">
          {product.description.length > 80
            ? `${product.description.substring(0, 80)}...`
            : product.description}
        </p>
      )}
      <div className="flex items-center gap-2 mb-2">
        {hasDiscount && (
          <span className="text-xs text-gray-400 line-through">
            ${price.toFixed(2)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">
          $
          {(finalPrice > 0 ? finalPrice : price).toFixed(2)}
        </span>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-blue-600 text-blue-600" />
          <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
