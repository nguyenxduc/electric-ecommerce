import { Star, Store as StoreIcon, Zap } from 'lucide-react'
import { PLACEHOLDER_IMAGE } from '../../utils/placeholderImage'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { trackBehavior } from '../../services/behaviorService'
import Payment from './Payment'
import TechnicalDetail from './TechnicalDetail'
import ProductDescription from './ProductDescription'
import ProductImage from './ProductImage'

import type { Product } from '../../types/product'
import { useSimilarProducts } from '../../hooks/useProducts'
import ListProduct from './ListProduct'
import ReviewComponent from './Review'
import { getProductColors } from '../../utils/productColors'
import VariantPicker from './VariantPicker'
import ShopCard from './ShopCard'
import Countdown from '../common/Countdown'
import MoreFromShop from './MoreFromShop'
import RecentlyViewed from './RecentlyViewed'
import { addRecentlyViewed } from '../../utils/recentlyViewed'
import ShopVouchers from '../shop/ShopVouchers'
import ReportProduct from './ReportProduct'
import ProductQuestions from './ProductQuestions'

interface ProductDetailProps {
  product: Product
}

const ProductDetail = ({ product }: ProductDetailProps) => {
  // /product/<slug>#reviews (nut "Write review" o don hang) mo thang tab danh gia;
  // #questions (thong bao shop da tra loi) mo tab hoi dap
  const [selectedInfo, setSelectedInfo] = useState(() =>
    window.location.hash === '#reviews'
      ? 'comment'
      : window.location.hash === '#questions'
        ? 'questions'
        : 'description'
  )
  const [mainImage, setMainImage] = useState(
    PLACEHOLDER_IMAGE
  )
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [expanded, setExpanded] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null
  )
  const variants = product.variants ?? []
  const selectedVariant =
    variants.find(v => v.id === selectedVariantId) ?? null
  const visibleCount = expanded ? product.specs.length : 5

  const { data: similarProducts } = useSimilarProducts(Number(product.id), 6)

  const colors = useMemo(
    () => getProductColors(product.available_colors, product.color),
    [product.available_colors, product.color]
  )

  useEffect(() => {
    // Scroll to top only when the product changes, not on every render or tab switch
    if (window.location.hash === '#reviews') {
      const toReviews = () => document.getElementById('reviews')?.scrollIntoView()
      toReviews()
      // The shop / "More from" tai sau va day muc danh gia xuong: cuon lai moi
      // lan trang doi chieu cao trong 10s dau, dung ngay khi nguoi dung tu cuon
      const ro = new ResizeObserver(toReviews)
      // body cao co dinh bang viewport; noi dung lon dan nam trong #root
      ro.observe(document.getElementById('root') ?? document.body)
      const stop = () => {
        ro.disconnect()
        window.removeEventListener('wheel', stop)
        window.removeEventListener('touchstart', stop)
      }
      window.addEventListener('wheel', stop, { once: true })
      window.addEventListener('touchstart', stop, { once: true })
      const timer = setTimeout(stop, 10000)
      return () => {
        clearTimeout(timer)
        stop()
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [product?.id])

  useEffect(() => {
    if (product?.id) addRecentlyViewed(Number(product.id))
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

  useEffect(() => {
    setSelectedVariantId(null)
  }, [product?.id])

  return (
    <div className="pt-6 sm:pt-10 pb-24 lg:pb-12">
      <div className="section-wrap">
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_340px] gap-8 lg:gap-10">
            {/* Image Gallery */}
            <div className="lg:col-span-1 space-y-4">
              <div className="relative aspect-square bg-[#f3f1ec] rounded-3xl overflow-hidden">
                <ProductImage
                  src={mainImage}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-contain p-8 mix-blend-multiply"
                />
              </div>
              {product.img.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.img.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setMainImage(image)}
                      aria-label={`Show image ${index + 1}`}
                      aria-pressed={mainImage === image}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[#f3f1ec] ring-2 ring-offset-2 ring-offset-paper ${
                        mainImage === image ? 'ring-ink' : 'ring-transparent hover:ring-gray-300'
                      }`}
                    >
                      <ProductImage
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-contain p-1.5 mix-blend-multiply"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h1 className="text-3xl lg:text-[40px] leading-[1.1] font-extrabold tracking-tight text-ink mb-4">
                  {product.name}
                </h1>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
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
                {product.shop && (
                  <Link
                    to={`/shop/${product.shop.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
                  >
                    <StoreIcon className="w-4 h-4" />
                    Sold by{' '}
                    <span className="font-medium text-blue-600">{product.shop.name}</span>
                  </Link>
                )}
              </div>

              {product.shop && <ShopVouchers slug={product.shop.slug} />}

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

              {variants.length > 0 && (
                <div id="variant-picker" className="scroll-mt-24">
                <VariantPicker
                  key={product.id}
                  variants={variants}
                  selectedId={selectedVariantId}
                  onSelect={setSelectedVariantId}
                />
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

            {/* Cot mua hang dinh khi cuon tren desktop (ca link Report, de khong bi khung gia che) */}
            <div className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start space-y-3">
              {product.flash_sale?.active && product.flash_sale.ends_at && (
                <div
                  data-testid="flash-banner"
                  className="mb-3 flex items-center justify-between rounded-2xl bg-sale-600 px-4 py-2.5 text-white"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Zap className="w-4 h-4 fill-current" />
                    Flash Sale
                  </span>
                  <span className="flex items-center gap-2 text-sm">
                    Ends in
                    <Countdown endsAt={product.flash_sale.ends_at} className="bg-black/30 rounded px-2 py-0.5 font-bold" />
                  </span>
                </div>
              )}
              <Payment
                discount={product.discount}
                price={product.price}
                final_price={product.final_price}
                discount_percentage={product.discount_percentage}
                selectedColor={selectedColor}
                colors={colors}
                id={product.id}
                quantity={product.quantity}
                variants={variants}
                selectedVariant={selectedVariant}
              />
              {!product.is_owner && <ReportProduct productId={product.id} />}
            </div>
          </div>
        </div>

        {product.shop && <ShopCard slug={product.shop.slug} />}
        {product.shop && (
          <MoreFromShop slug={product.shop.slug} shopName={product.shop.name} excludeId={product.id} />
        )}

        {/* Tabs Section */}
        <div id="reviews" className="mt-12 scroll-mt-24">
          <nav className="border-b border-gray-200 overflow-x-auto">
            <div className="flex gap-6 sm:gap-8 whitespace-nowrap">
              <button
                onClick={() => setSelectedInfo('description')}
                className={`pb-4 px-1 text-base font-medium transition-colors ${
                  selectedInfo === 'description'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Product Description
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
              <button
                onClick={() => setSelectedInfo('questions')}
                className={`pb-4 px-1 text-base font-medium transition-colors ${
                  selectedInfo === 'questions'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Questions
              </button>
            </div>
          </nav>
          <div className="mt-8">
            {selectedInfo === 'description' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Product Description
                  </h3>
                  <span className="text-sm text-gray-500">
                    Detailed overview with photos
                  </span>
                </div>
                <ProductDescription
                  description={product.description}
                  productName={product.name}
                />
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
              <ReviewComponent productId={Number(product.id)} shopName={product.shop?.name} />
            )}
            {selectedInfo === 'questions' && (
              <ProductQuestions productId={Number(product.id)} isOwner={!!product.is_owner} />
            )}
          </div>
        </div>
        <div className="mt-8">
          <RecentlyViewed key={product.id} excludeId={Number(product.id)} />
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
