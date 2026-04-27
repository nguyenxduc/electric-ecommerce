// @ts-ignore
import StarIcon from '../../../assets/star-icon.svg'
// @ts-ignore
import StockIcon from '../../../assets/stock-icon.svg'
// @ts-ignore
import GuaranteeIcon from '../../../assets/guarantee-icon.svg'
// @ts-ignore
import DeliveryIcon from '../../../assets/delivery-icon.svg'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { trackBehavior } from '../../services/behaviorService'
import Payment from './Payment'
import TechnicalDetail from './TechnicalDetail'

import type { Product } from '../../types/product'
import { useSimilarProducts } from '../../hooks/useProducts'
import ListProduct from './ListProduct'
import ReviewComponent from './Review'

interface ProductDetailProps {
  product: Product
}

const ProductDetail = ({ product }: ProductDetailProps) => {
  const [selectedInfo, setSelectedInfo] = useState('description')
  const [mainImage, setMainImage] = useState(
    'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'
  )
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [expanded, setExpanded] = useState(false)
  const visibleCount = expanded ? product.specs.length : 5

  const { data: similarProducts } = useSimilarProducts(Number(product.id), 6)

  const colors =
    (product.available_colors && product.available_colors.length > 0
      ? product.available_colors
      : product.color) || []

  useEffect(() => {
    // Scroll to top only when the product changes, not on every render or tab switch
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [product?.id])

  useEffect(() => {
    if (product?.id) {
      trackBehavior('view', product.id, { source: 'product_detail' })
    }
  }, [product?.id])

  useEffect(() => {
    if (product?.img?.length > 0) {
      setMainImage(product.img[0])
    }
    if (colors.length > 0) {
      setSelectedColor(colors[0].name)
    } else {
      setSelectedColor('')
    }
  }, [product, colors])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="lg:col-span-1 space-y-4">
              <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                />
              </div>
              {product.img.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.img.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setMainImage(image)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        mainImage === image
                          ? 'border-blue-600 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-blue-700 px-3 py-1.5 rounded-lg">
                    <Star className="w-4 h-4 fill-blue-600 text-blue-600" />
                    <span className="font-semibold text-black">
                      {product.rating
                        ? parseFloat(String(product.rating)).toFixed(1)
                        : '0.0'}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">{product.sold}</span> sold
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              {colors && colors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Color
                  </h3>
                  <div className="flex gap-3">
                    {colors.map(c => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c.name)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          c.name === selectedColor
                            ? 'border-blue-600 ring-2 ring-blue-200 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: c.code }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Specifications */}
              {product.specs && product.specs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Key Specifications
                  </h3>
                  <dl className="space-y-2">
                    {product.specs.slice(0, visibleCount).map(s => (
                      <div
                        key={s.label}
                        className="flex justify-between py-2 border-b border-gray-100"
                      >
                        <dt className="text-sm text-gray-600">{s.label}</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {s.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {product.specs.length > 5 && (
                    <button
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded
                        ? 'Show Less'
                        : `Show All ${product.specs.length} Specifications`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Payment Section - Sticky on desktop */}
            <div className="lg:col-span-1">
              <Payment
                discount={product.discount}
                price={product.price}
                final_price={product.final_price}
                discount_percentage={product.discount_percentage}
                selectedColor={selectedColor}
                colors={colors}
                id={product.id}
                quantity={product.quantity}
              />
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12">
          <nav className="border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setSelectedInfo('description')}
                className={`pb-4 px-1 text-base font-medium transition-colors ${
                  selectedInfo === 'description'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setSelectedInfo('technical')}
                className={`pb-4 px-1 text-base font-medium transition-colors ${
                  selectedInfo === 'technical'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Technical Details
              </button>
              <button
                onClick={() => setSelectedInfo('similar')}
                className={`pb-4 px-1 text-base font-medium transition-colors ${
                  selectedInfo === 'similar'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Similar Products
              </button>
              <button
                onClick={() => setSelectedInfo('comment')}
                className={`pb-4 px-1 text-base font-medium transition-colors ${
                  selectedInfo === 'comment'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Reviews & Comments
              </button>
            </div>
          </nav>
          <div className="mt-8">
            {selectedInfo === 'description' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Product Description
                </h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description ||
                      'No description available for this product.'}
                  </p>
                </div>
              </div>
            )}
            {selectedInfo === 'technical' && (
              <TechnicalDetail specs={product.specs_detail} />
            )}
            {selectedInfo === 'similar' && (
              <ListProduct
                title="Similar Products"
                products={similarProducts || null}
              />
            )}
            {selectedInfo === 'comment' && (
              <ReviewComponent productId={Number(product.id)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
