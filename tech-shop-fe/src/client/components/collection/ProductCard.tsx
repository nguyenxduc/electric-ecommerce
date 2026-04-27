import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { trackBehavior } from '../../services/behaviorService'
import type { Product } from '../../types/product'

interface ProductCardProps {
  product: Product
  slug?: string
}

const ProductCard = ({ product, slug }: ProductCardProps) => {
  const navigate = useNavigate()

  // Calculate discount percentage if not provided
  const discountPercentage =
    product.discount_percentage ??
    (product.price > 0
      ? Math.round((product.discount / product.price) * 100)
      : 0)

  const hasDiscount = discountPercentage > 0

  return (
    <div
      className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => {
        trackBehavior('click', product.id, { source: 'product_card' })
        navigate(`/product/${slug || product.id}`)
      }}
    >
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
            ${product.price.toFixed(2)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">
          $
          {product.final_price
            ? product.final_price.toFixed(2)
            : product.price.toFixed(2)}
        </span>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-blue-600 text-blue-600" />
          <span className="text-sm font-semibold">
            {product.rating?.toFixed(1) || '0.0'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
