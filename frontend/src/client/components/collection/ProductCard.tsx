import { useNavigate } from 'react-router-dom'
import { Star, Store, Zap } from 'lucide-react'
import { trackBehavior } from '../../services/behaviorService'
import type { Product } from '../../types/product'
import ProductImage from '../products/ProductImage'
import { makeProductSlug } from '../../utils/productSlug'

interface ProductCardProps {
  product: Product
  slug?: string
  compareSelected?: boolean
  compareDisabled?: boolean
  compareDisabledReason?: string
  onCompareToggle?: (product: Product) => void
}

// 1234 -> "1.2K": so da ban dang gon nhu cac san
const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(n)

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
      className="group relative flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-200 transition cursor-pointer"
      onClick={() => {
        trackBehavior('click', product.id, { source: 'product_card' })
        navigate(`/product/${slug || makeProductSlug(product.name, product.id)}`)
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
          className={`absolute top-2 right-2 z-20 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none ${
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

      <div className="relative aspect-square bg-gray-50">
        {product.flash_sale?.active && (
          <span className="absolute top-2 left-2 z-10 flex items-center gap-0.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            <Zap className="w-3 h-3 fill-current" />
            Flash
          </span>
        )}
        {product.img && product.img.length > 0 ? (
          <ProductImage
            src={product.img[0]}
            alt={product.name}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-3">
        <h3 className="text-sm text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-lg font-bold text-rose-600">
            ${(finalPrice > 0 ? finalPrice : price).toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 rounded px-1">
              -{discountPercentage}%
            </span>
          )}
        </div>
        {hasDiscount && (
          <span className="text-xs text-gray-400 line-through">${price.toFixed(2)}</span>
        )}
        <div className="mt-auto pt-2 flex items-center gap-1 text-xs text-gray-500">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
          <span className="text-gray-300">|</span>
          <span>{compact(asNumber(product.sold))} sold</span>
        </div>
        {product.shop?.name && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-400 truncate">
            <Store className="w-3 h-3 shrink-0" />
            <span className="truncate">{product.shop.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductCard
