import { Link, useParams } from 'react-router-dom'
import ProductDetail from '../components/products/ProductDetail'
import { useProductById } from '../hooks/useProducts'
import { ProductDetailSkeleton } from '../components/common/LoadingSkeleton'
import { parseProductIdFromSlug } from '../utils/productSlug'
import { apiErrorResponse } from '../../lib/apiError'

const Detail = () => {
  const { slug } = useParams<{ slug: string }>()
  const productId = parseProductIdFromSlug(slug)

  const { data: product, isLoading, error } = useProductById(productId || 0)

  if (isLoading) {
    return <ProductDetailSkeleton />
  }

  // Slug sai hoac API 404 (san pham bi an/xoa): bao het hang than thien thay vi loi
  if (!productId || apiErrorResponse(error).status === 404) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">This product is no longer available</h1>
        <p className="text-gray-500 mb-6">It may have been removed or hidden by the shop.</p>
        <Link
          to="/collection/all"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Browse products
        </Link>
      </div>
    )
  }

  if (error || !product) {
    return <div>Error loading product details.</div>
  }

  return (
    <div>
      <ProductDetail product={product} />
    </div>
  )
}

export default Detail
