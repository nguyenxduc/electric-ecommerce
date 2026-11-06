import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Store,
  MapPin,
  Package,
  Star,
  ChevronLeft,
  MessageCircle,
  Ticket,
  Copy
} from 'lucide-react'
import {
  getShopBySlug,
  getShopProducts,
  getShopVouchers
} from '../services/shopService'
import ProductGrid from '../components/collection/ProductGrid'
import Pagination from '../components/collection/Pagination'
import { ShopChatPanel } from '../components/chat/ChatWidget'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Best selling' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' }
]

const ShopPublic = () => {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('newest')
  const [chatOpen, setChatOpen] = useState(false)

  const {
    data: shop,
    isLoading: shopLoading,
    isError: shopError
  } = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => getShopBySlug(slug!),
    enabled: !!slug,
    retry: false
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', slug, page, sort],
    queryFn: () => getShopProducts(slug!, { page, limit: 15, sort }),
    enabled: !!slug && !!shop && shop.status === 'active'
  })

  const { data: vouchers = [] } = useQuery({
    queryKey: ['shop-vouchers', slug],
    queryFn: () => getShopVouchers(slug!),
    enabled: !!slug && !!shop && shop.status === 'active'
  })

  if (shopLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Store className="w-12 h-12 text-gray-300 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-800">
            Shop not found
          </h1>
          <p className="text-gray-500">
            This shop doesn't exist or is not open yet.
          </p>
          <Link
            to="/collection/all"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" /> Browse products
          </Link>
        </div>
      </div>
    )
  }

  const products = productsData?.products || []
  const pagination = productsData?.pagination

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Shop header */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {shop.banner_url ? (
          <div
            className="h-40 bg-cover bg-center"
            style={{ backgroundImage: `url(${shop.banner_url})` }}
          />
        ) : (
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
        )}
        <div className="px-6 pb-6 -mt-8 flex flex-col md:flex-row md:items-end gap-4">
          <div className="h-20 w-20 rounded-xl bg-white border shadow flex items-center justify-center overflow-hidden shrink-0">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{shop.name}</h1>
            {shop.description && (
              <p className="text-gray-600 text-sm mt-1 max-w-2xl">
                {shop.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {shop._count?.products ?? 0} products
              </span>
              {shop.rating != null && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {shop.rating} ({shop.review_count} reviews)
                </span>
              )}
              {shop.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {shop.address}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!shop.is_owner && (
              <button
                onClick={() => setChatOpen(true)}
                className="px-4 py-2 border-2 border-blue-600 text-blue-600 text-sm rounded-lg hover:bg-blue-50 flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Chat with shop
              </button>
            )}
            {shop.is_owner && (
              <Link
                to="/seller"
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Manage shop
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Shop vouchers */}
      {vouchers.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-red-500" /> Shop Vouchers
          </h2>
          <div className="flex flex-wrap gap-3">
            {vouchers.map(v => (
              <div
                key={v.id}
                className="flex items-center gap-3 border border-dashed border-red-300 bg-red-50/50 rounded-lg px-4 py-2"
              >
                <div>
                  <p className="text-sm font-bold text-red-600">
                    {v.discount_type === 'percent'
                      ? `${Number(v.discount_value)}% OFF`
                      : `$${Number(v.discount_value)} OFF`}
                  </p>
                  <p className="text-xs text-gray-600">
                    {v.min_order ? `Min order $${Number(v.min_order)}` : 'No minimum'}
                    {v.expires_at
                      ? ` · until ${new Date(v.expires_at).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(v.code)
                    toast.success(`Copied code ${v.code} - apply it at checkout`)
                  }}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded flex items-center gap-1 hover:bg-red-600"
                >
                  <Copy className="w-3 h-3" /> {v.code}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Products</h2>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={sort}
          onChange={e => {
            setSort(e.target.value)
            setPage(1)
          }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          This shop has no products yet.
        </div>
      ) : (
        <>
          <ProductGrid products={products} />
          {pagination && pagination.total_pages > 1 && (
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.total_pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <ShopChatPanel
        shopId={shop.id}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  )
}

export default ShopPublic
