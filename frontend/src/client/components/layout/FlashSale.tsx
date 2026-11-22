import { Zap } from 'lucide-react'
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
    <section data-testid="flash-sale-strip" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-10">
      <div className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4 text-white">
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
            <Zap className="w-6 h-6 fill-current" />
            Flash Sale
          </h2>
          <span className="flex items-center gap-2 text-sm">
            Ends in
            <Countdown endsAt={endsAt} className="bg-black/30 rounded px-2 py-0.5 font-bold" />
          </span>
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

export default FlashSale
