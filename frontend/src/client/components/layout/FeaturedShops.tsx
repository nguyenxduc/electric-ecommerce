import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Store } from 'lucide-react'
import { listShops } from '../../services/shopService'
import SectionHeader from '../common/SectionHeader'

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
    <section className="section-wrap mt-16">
      <SectionHeader eyebrow="Sellers" title="Featured shops" to="/shops" linkLabel="All shops" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {shops.map(shop => (
          <li key={shop.id}>
            <Link
              to={`/shop/${shop.slug}`}
              className="lift flex h-full items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/70 lg:flex-col lg:p-5 lg:text-center"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 lg:h-14 lg:w-14">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" width={56} height={56} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-6 w-6 text-gray-400" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{shop.name}</span>
                <span className="block text-xs text-gray-500">
                  <span className="price">{shop._count?.products ?? 0}</span> products
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default FeaturedShops
