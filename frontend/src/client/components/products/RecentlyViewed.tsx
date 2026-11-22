import { useState } from 'react'
import { useRecentlyViewedProducts } from '../../hooks/useProducts'
import { clearRecentlyViewed, getRecentlyViewed } from '../../utils/recentlyViewed'
import { makeProductSlug } from '../../utils/productSlug'
import ProductCard from '../collection/ProductCard'

// Dai "Recently viewed": excludeId = san pham dang xem (trang chi tiet); canClear = nut Clear (trang chu)
const RecentlyViewed = ({ excludeId, canClear }: { excludeId?: number; canClear?: boolean }) => {
  const [ids, setIds] = useState(() => getRecentlyViewed().filter(id => id !== excludeId))
  const { data } = useRecentlyViewedProducts(ids)
  const products = data ?? []
  if (!ids.length || !products.length) return null

  return (
    <section data-testid="recently-viewed">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">Recently viewed</h2>
        {canClear && (
          <button
            onClick={() => {
              clearRecentlyViewed()
              setIds([])
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 snap-x">
        {products.map(p => (
          <li key={p.id} className="w-40 sm:w-48 shrink-0 snap-start">
            <ProductCard product={p} slug={makeProductSlug(p.name, p.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RecentlyViewed
