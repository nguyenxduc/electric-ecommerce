import React from 'react'
import { useParams } from 'react-router-dom'
import ProductDetail from '../components/products/ProductDetail'
import { useProductById } from '../hooks/useProducts'
import { ProductDetailSkeleton } from '../components/common/LoadingSkeleton'
import { parseProductIdFromSlug } from '../utils/productSlug'

const Detail = () => {
  const { slug } = useParams<{ slug: string }>()
  const productId = parseProductIdFromSlug(slug)

  const { data: product, isLoading, error } = useProductById(productId || 0)

  if (isLoading) {
    return <ProductDetailSkeleton />
  }

  if (!productId || error || !product) {
    return <div>Error loading product details.</div>
  }

  return (
    <div>
      <ProductDetail product={product} />
    </div>
  )
}

export default Detail
