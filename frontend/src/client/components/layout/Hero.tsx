import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { usePublicSettings } from '../../hooks/useSettings'
import { useNewProducts } from '../../hooks/useProducts'
import { listShops } from '../../services/shopService'
import ProductImage from '../products/ProductImage'
import { makeProductSlug } from '../../utils/productSlug'

const PERKS = ['Every shop reviewed before it opens', 'Orders tracked to your door', 'Cash on delivery or MoMo', 'One cart for many shops']

// Hero trang chu: chu lon ben trai, ben phai la san pham that moi len ke (khong dung anh minh hoa)
const Hero = () => {
  const { data } = usePublicSettings('general')
  const storeName = data?.settings?.store_name || 'Tech Shop'
  const { data: newest } = useNewProducts()
  const { data: allShops = [] } = useQuery({
    queryKey: ['shops', 'directory', ''],
    queryFn: () => listShops({ limit: 60 })
  })
  const shops = allShops.filter(s => (s._count?.products ?? 0) > 0)
  const picks = (newest?.products ?? []).filter(p => p.img?.[0]).slice(0, 4)
  const productCount = newest?.pagination.total_count

  return (
    <section className="section-wrap pt-8 sm:pt-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="animate-fade-up">
          <p className="eyebrow">{storeName} marketplace</p>
          <h1 className="mt-4 text-[40px] leading-[1.05] sm:text-6xl font-extrabold tracking-tight text-ink">
            Tech from shops we checked first.
          </h1>
          <p className="mt-5 max-w-md text-lg text-gray-600">
            Phones, laptops and accessories from independent sellers. Compare them side by side, or ask the assistant
            which one fits.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/collection/all" className="btn-primary !px-6 !py-3 group">
              Shop all products
              <ArrowRight
                className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link to="/profile?tab=seller" className="btn-secondary !px-6 !py-3">
              Sell on {storeName}
            </Link>
          </div>
          {(productCount || shops.length > 0) && (
            <dl className="mt-10 flex gap-10">
              {productCount ? (
                <div>
                  <dt className="text-xs text-gray-500">Products</dt>
                  <dd className="price text-2xl font-bold text-ink">{productCount.toLocaleString()}</dd>
                </div>
              ) : null}
              {shops.length > 0 && (
                <div>
                  <dt className="text-xs text-gray-500">Verified shops</dt>
                  <dd className="price text-2xl font-bold text-ink">{shops.length}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {picks.length === 4 && (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {picks.map((p, i) => (
              <li
                key={p.id}
                className={`animate-fade-up ${i % 2 === 1 ? 'translate-y-6' : ''}`}
                style={{ animationDelay: `${[80, 140, 190, 230][i]}ms` }}
              >
                <Link
                  to={`/product/${makeProductSlug(p.name, p.id)}`}
                  className="zoom-on-hover lift block overflow-hidden rounded-3xl bg-white"
                >
                  <div className="relative aspect-square">
                    <ProductImage src={p.img[0]} alt={p.name} className="absolute inset-0 h-full w-full object-contain p-6" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 border-t border-gray-100 px-4 py-3">
                    <span className="truncate text-sm text-gray-700">{p.name}</span>
                    <span className="price shrink-0 text-sm font-semibold text-ink">
                      ${Number(p.final_price || p.price).toFixed(2)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="mt-16 grid grid-cols-2 gap-y-3 border-y border-gray-200 py-4 text-sm text-gray-600 lg:grid-cols-4">
        {PERKS.map(p => (
          <li key={p} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Hero
