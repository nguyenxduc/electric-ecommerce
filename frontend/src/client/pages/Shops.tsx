import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Search, Store } from 'lucide-react'
import { listShops } from '../services/shopService'

// Danh ba shop: tim theo ten, tu khoa song o URL (?q=) de chia se/quay lai duoc
export default function Shops() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  useEffect(() => setDraft(q), [q])

  const { data = [], isLoading } = useQuery({
    queryKey: ['shops', 'directory', q],
    queryFn: () => listShops({ limit: 60, search: q || undefined }),
    placeholderData: keepPreviousData
  })
  // Shop vua duoc duyet chua co san pham thi chua hien
  const shops = data.filter(s => (s._count?.products ?? 0) > 0)

  return (
    <div className="section-wrap py-10 pb-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h1 className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight">Shops</h1>
          <p className="mt-2 text-gray-600">Every seller here was reviewed by our team before opening.</p>
        </div>
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault()
            setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true })
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            name="q"
            aria-label="Search shops"
            placeholder="Search shops…"
            autoComplete="off"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-ink focus:outline-none"
          />
        </form>
      </div>

      {isLoading ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-44 rounded-2xl bg-white animate-pulse" />
          ))}
        </ul>
      ) : shops.length === 0 ? (
        <p className="mt-12 text-center text-gray-500">{q ? `No shops match “${q}”.` : "No shops yet."}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map(shop => (
            <li key={shop.id}>
              <Link
                to={`/shop/${shop.slug}`}
                className="lift group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                <div className="h-20 bg-gradient-to-br from-brand-100 to-paper">
                  {shop.banner_url && (
                    <img src={shop.banner_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="-mt-7 px-5 pb-5">
                  <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-gray-50 shadow-sm">
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt="" className="h-full w-full object-cover" width={56} height={56} />
                    ) : (
                      <Store className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    )}
                  </span>
                  <p className="mt-3 font-semibold text-ink line-clamp-1">{shop.name}</p>
                  {shop.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{shop.description}</p>}
                  <p className="mt-3 text-xs text-gray-500">
                    <span className="font-semibold text-ink price">{shop._count?.products ?? 0}</span> products
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
