import { Link } from 'react-router-dom'
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
  // Hien them so tien tiet kiem canh % (khoi Top deals)
  showSavings?: boolean
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
  onCompareToggle,
  showSavings = false
}: ProductCardProps) => {
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

  const href = `/product/${slug || makeProductSlug(product.name, product.id)}`
  const shown = finalPrice > 0 ? finalPrice : price
  // So tien tiet kiem that (tinh ca flash sale): so tron thi bo phan le
  const saved = Math.round((price - shown) * 100) / 100
  const savedLabel = Number.isInteger(saved) ? `$${saved.toLocaleString('en-US')}` : `$${saved.toFixed(2)}`

  return (
    <div className="zoom-on-hover lift group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 focus-within:ring-2 focus-within:ring-brand-500">
      {onCompareToggle && (
        <button
          type="button"
          disabled={compareDisabled && !compareSelected}
          aria-pressed={compareSelected}
          onClick={() => onCompareToggle(product)}
          className={`absolute top-2.5 right-2.5 z-20 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
            compareSelected
              ? 'bg-ink text-white hover:bg-brand-800'
              : 'bg-white/90 text-gray-700 ring-1 ring-gray-200 hover:ring-ink'
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

      <div className="relative aspect-square overflow-hidden bg-[#f3f1ec]">
        {product.flash_sale?.active && (
          <span className="absolute top-2.5 left-2.5 z-10 flex items-center gap-0.5 rounded-full bg-sale-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Zap className="w-3 h-3 fill-current" aria-hidden="true" />
            Flash
          </span>
        )}
        {product.img && product.img.length > 0 ? (
          <ProductImage src={product.img[0]} alt={product.name} className="absolute inset-0 h-full w-full object-contain p-5 mix-blend-multiply" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">No image</div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-gray-800">
          {/* Link phu ca the (after:inset-0): bam dau tren the cung mo san pham, van la <a> that */}
          <Link
            to={href}
            onClick={() => trackBehavior('click', product.id, { source: 'product_card' })}
            className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {showSavings && hasDiscount ? (
          <div className="mt-2">
            <span className="price text-lg font-bold text-ink">${shown.toFixed(2)}</span>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="price text-gray-400 line-through">${price.toFixed(2)}</span>
              <span className="price font-semibold text-sale-600">-{discountPercentage}%</span>
              {saved > 0 && <span className="price text-gray-400">Save {savedLabel}</span>}
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className="price text-lg font-bold text-ink">${shown.toFixed(2)}</span>
            {hasDiscount && (
              <>
                <span className="price text-xs text-gray-400 line-through">${price.toFixed(2)}</span>
                <span className="price text-xs font-semibold text-sale-600">-{discountPercentage}%</span>
              </>
            )}
          </div>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-gray-500">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
          <span aria-hidden="true">·</span>
          <span>{compact(asNumber(product.sold))} sold</span>
        </div>
        {product.shop?.name && (
          <div className="mt-1 flex items-center gap-1 truncate text-xs text-gray-400">
            <Store className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{product.shop.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductCard
