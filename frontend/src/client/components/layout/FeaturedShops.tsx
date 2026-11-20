import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Store, ChevronRight } from 'lucide-react'
import { listShops } from '../../services/shopService'

// Khoi "shop noi bat" tren trang chu: tin hieu ro nhat day la san nhieu nguoi ban
const FeaturedShops = () => {
  const { data = [] } = useQuery({
    queryKey: ['shops', 'featured'],
    queryFn: () => listShops({ limit: 12 })
  })
  // An shop chua co san pham (vua duoc duyet) de khoi trong trong
  const shops = data.filter(s => (s._count?.products ?? 0) > 0).slice(0, 6)
  if (!shops.length) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Featured shops</h2>
          <p className="text-sm text-gray-500 mt-1">Verified sellers on the marketplace</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {shops.map(shop => (
          <li key={shop.id}>
            <Link
              to={`/shop/${shop.slug}`}
              className="group flex flex-col items-center text-center h-full bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition"
            >
              <span className="w-14 h-14 rounded-full border bg-gray-50 overflow-hidden flex items-center justify-center">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-gray-400" />
                )}
              </span>
              <span className="mt-3 text-sm font-semibold text-gray-900 line-clamp-1">{shop.name}</span>
              <span className="text-xs text-gray-500 mt-0.5">{shop._count?.products ?? 0} products</span>
              <span className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 group-hover:underline">
                Visit shop <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FeaturedShops
