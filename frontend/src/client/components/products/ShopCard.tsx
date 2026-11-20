import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Store, Star, Package, MapPin, CalendarDays } from 'lucide-react'
import { getShopBySlug } from '../../services/shopService'
import { ShopChatPanel } from '../chat/ChatWidget'

// The shop block under the product, like the seller strip on marketplace product pages
const ShopCard = ({ slug }: { slug: string }) => {
  const [chatOpen, setChatOpen] = useState(false)
  // Same key as ShopPublic so the shop page opens from cache
  const { data: shop } = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => getShopBySlug(slug),
    retry: false
  })
  if (!shop) return null

  const stats = [
    { icon: Star, label: 'Rating', value: shop.rating != null ? `${Number(shop.rating).toFixed(1)} (${shop.review_count ?? 0})` : 'No reviews' },
    { icon: Package, label: 'Products', value: String(shop._count?.products ?? 0) },
    { icon: CalendarDays, label: 'Joined', value: new Date(shop.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) },
    ...(shop.address ? [{ icon: MapPin, label: 'Ships from', value: shop.address }] : [])
  ]

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-6">
      <div className="flex items-center gap-4 lg:pr-6 lg:border-r border-gray-100 shrink-0">
        <div className="w-16 h-16 rounded-full border bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-7 h-7 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{shop.name}</p>
          <span className="inline-block mt-1 text-xs font-medium text-blue-700 bg-blue-50 rounded px-2 py-0.5">
            Verified seller
          </span>
          <div className="flex gap-2 mt-3">
            {!shop.is_owner && (
              <button
                onClick={() => setChatOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                <MessageCircle className="w-4 h-4" /> Chat
              </button>
            )}
            <Link
              to={`/shop/${shop.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Store className="w-4 h-4" /> View shop
            </Link>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
        {stats.map(s => (
          <div key={s.label}>
            <dt className="flex items-center gap-1.5 text-xs text-gray-500">
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </dt>
            <dd className="text-sm font-medium text-gray-900 mt-1 truncate">{s.value}</dd>
          </div>
        ))}
      </dl>
      <ShopChatPanel shopId={shop.id} open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

export default ShopCard
