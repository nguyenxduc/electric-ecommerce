import { Link } from 'react-router-dom'
import { Zap, ChevronRight } from 'lucide-react'
import { useTopDeals } from '../../hooks/useProducts'
import ProductCard from '../collection/ProductCard'
import { makeProductSlug } from '../../utils/productSlug'

// Dai deal cuon ngang tren trang chu; khong co dong ho dem nguoc vi san chua co
// khuyen mai co thoi han (chi hien giam gia that cua san pham)
const TopDeals = () => {
  const { data } = useTopDeals()
  const products = data?.products || []
  if (!products.length) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-10">
      <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900">
            <span className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center">
              <Zap className="w-5 h-5 fill-current" />
            </span>
            Top deals
          </h2>
          <Link
            to="/collection/all?sort=discount"
            className="flex items-center text-sm font-medium text-rose-600 hover:underline"
          >
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <ul className="flex gap-3 overflow-x-auto pb-1 snap-x">
          {products.map(p => (
            <li key={p.id} className="w-40 sm:w-48 shrink-0 snap-start">
              <ProductCard product={p} slug={makeProductSlug(p.name, p.id)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default TopDeals
