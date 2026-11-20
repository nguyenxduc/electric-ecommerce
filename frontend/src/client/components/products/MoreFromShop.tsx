import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { getShopProducts } from '../../services/shopService'
import ProductCard from '../collection/ProductCard'
import { makeProductSlug } from '../../utils/productSlug'
import type { Product } from '../../types/product'

// "Them tu shop nay": san pham ban chay cung shop, tru san pham dang xem
const MoreFromShop = ({ slug, shopName, excludeId }: { slug: string; shopName: string; excludeId: number }) => {
  const { data } = useQuery({
    queryKey: ['shop-products', slug, 'more', 'popular'],
    queryFn: () => getShopProducts(slug, { limit: 7, sort: 'popular' })
  })
  const products: Product[] = (data?.products || [])
    .filter((p: Product) => p.id !== excludeId)
    .slice(0, 6)
  if (!products.length) return null

  return (
    <section className="mt-6">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">More from {shopName}</h2>
        <Link to={`/shop/${slug}`} className="flex items-center text-sm font-medium text-blue-600 hover:underline">
          View shop <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {products.map(p => (
          <ProductCard key={p.id} product={p} slug={makeProductSlug(p.name, p.id)} />
        ))}
      </div>
    </section>
  )
}

export default MoreFromShop
