import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'
import { useFlashSale } from '../../hooks/useProducts'
import ProductCard from '../collection/ProductCard'
import Countdown from '../common/Countdown'
import { makeProductSlug } from '../../utils/productSlug'

// Dai Flash Sale tren trang chu: dem nguoc toi san pham het som nhat (API da sap theo ends_at)
const FlashSale = () => {
  const { data } = useFlashSale()
  const products = data?.products || []
  const endsAt = products[0]?.flash_sale?.ends_at
  if (!products.length || !endsAt) return null

  return (
    <section data-testid="flash-sale-strip" className="section-wrap mt-16">
      <div className="rounded-3xl bg-ink p-5 sm:p-7 text-white">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sale-300">
              <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Today only
            </p>
            <h2 className="mt-1.5 flex flex-wrap items-baseline gap-x-4 text-2xl font-bold sm:text-[28px]">
              Flash Sale
              <span className="flex items-center gap-2 text-sm font-normal text-white/60">
                Ends in
                <Countdown endsAt={endsAt} className="rounded-md bg-sale-600 px-2 py-0.5 font-bold text-white" />
              </span>
            </h2>
          </div>
          <Link
            to="/flash-sale"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-sale-200"
          >
            See every deal
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 text-ink">
          {products.map(p => (
            <li key={p.id} className="w-44 shrink-0 snap-start sm:w-52">
              <ProductCard product={p} slug={makeProductSlug(p.name, p.id)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default FlashSale
