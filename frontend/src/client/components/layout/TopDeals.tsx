import { useTopDeals } from '../../hooks/useProducts'
import ProductCard from '../collection/ProductCard'
import SectionHeader from '../common/SectionHeader'
import HorizontalScroller from '../common/HorizontalScroller'
import { makeProductSlug } from '../../utils/productSlug'

// Dai deal cuon ngang tren trang chu: giam gia that cua san pham (khong co han gio)
const TopDeals = () => {
  const { data } = useTopDeals()
  const products = data?.products || []
  if (!products.length) return null

  return (
    <section className="section-wrap mt-16">
      <SectionHeader eyebrow="Price drops" title="Top deals" to="/collection/all?sort=discount" linkLabel="See all" />
      <HorizontalScroller label="Top deals">
        {products.map(p => (
          <li key={p.id} className="w-44 shrink-0 snap-start sm:w-52">
            <ProductCard product={p} slug={makeProductSlug(p.name, p.id)} />
          </li>
        ))}
      </HorizontalScroller>
    </section>
  )
}

export default TopDeals
