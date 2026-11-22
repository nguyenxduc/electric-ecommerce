import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useFlashSale } from '../hooks/useProducts'
import ProductCard from '../components/collection/ProductCard'
import Countdown from '../components/common/Countdown'
import { ProductGridSkeleton } from '../components/common/LoadingSkeleton'
import { makeProductSlug } from '../utils/productSlug'

// Trang Flash Sale rieng: moi san pham dang trong khung gio, het som nhat len dau
export default function FlashSalePage() {
  const { data, isLoading } = useFlashSale(48)
  const products = data?.products || []
  const endsAt = products[0]?.flash_sale?.ends_at

  return (
    <div className="pb-16">
      <section className="bg-ink text-white">
        <div className="section-wrap py-10 sm:py-14 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sale-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Limited time
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">Flash sale</h1>
            <p className="mt-3 max-w-xl text-white/70">
              Shops cut prices for a few hours only. The price you see is the price you pay at checkout while the
              timer runs.
            </p>
          </div>
          {endsAt && (
            <div className="rounded-2xl bg-white/10 px-5 py-4">
              <p className="text-xs text-white/60">Next deal ends in</p>
              <Countdown endsAt={endsAt} className="mt-1 block text-3xl font-bold price" />
            </div>
          )}
        </div>
      </section>

      <div className="section-wrap mt-8">
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold">No flash deals running right now</p>
            <p className="mt-1 text-sm text-gray-500">Follow your favourite shops to hear about the next one.</p>
            <Link to="/collection/all?sort=discount" className="btn-primary mt-6">
              Browse discounted products
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.map(p => (
              <li key={p.id}>
                <ProductCard product={p} slug={makeProductSlug(p.name, p.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
