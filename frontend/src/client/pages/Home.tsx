import Hero from '../components/layout/Hero'
import Categories from '../components/products/Categories'
import FeaturedShops from '../components/layout/FeaturedShops'
import FlashSale from '../components/layout/FlashSale'
import RecentlyViewed from '../components/products/RecentlyViewed'
import TopDeals from '../components/layout/TopDeals'
import ListProduct from '../components/products/ListProduct'
import { useHomeRecommendations, useNewProducts, usePopularProducts } from '../hooks/useProducts'
import { recommendationStrategyLabel } from '../utils/recommendationLabel'
import type { ListProductRes, Product } from '../types/product'

const SECTION_SIZE = 4

// Cac muc trang chu chon lan luot, bo san pham muc truoc da hien (nhu cac san);
// het san pham khac thi dung lai danh sach goc de khong co muc rong.
const takeUnseen = (res: ListProductRes | null | undefined, seen: Set<number>): ListProductRes | null => {
  if (!res) return null
  const fresh = res.products.filter((p: Product) => !seen.has(p.id)).slice(0, SECTION_SIZE)
  const products = fresh.length > 0 ? fresh : res.products.slice(0, SECTION_SIZE)
  products.forEach(p => seen.add(p.id))
  return { ...res, products }
}

const Home = () => {
  const { data: newProduct, isLoading: loadingNew } = useNewProducts()
  const { data: popularProduct, isLoading: loadingPopular } = usePopularProducts()
  const { data: recommendationData, isLoading: loadingRecommendation } =
    useHomeRecommendations({ limit: 8 })

  const recommendationProducts: ListProductRes | null = recommendationData?.data
    ? {
        products: recommendationData.data.products,
        pagination: {
          current_page: 1,
          per_page: recommendationData.data.products.length,
          total_count: recommendationData.data.products.length,
          total_pages: 1
        }
      }
    : null

  const seen = new Set<number>()
  const recommended = takeUnseen(recommendationProducts, seen)
  const newest = takeUnseen(newProduct, seen)
  const popular = takeUnseen(popularProduct, seen)

  return (
    <div>
      <Hero />
      <Categories />
      <FlashSale />
      <TopDeals />
      <FeaturedShops />
      <div className="section-wrap pb-20">
        <div className="mt-16">
          <RecentlyViewed canClear />
        </div>
        <ListProduct
          title="Recommended for you"
          sectionLabel={recommendationStrategyLabel(recommendationData?.data?.strategy)}
          products={recommended}
          isLoading={loadingRecommendation}
        />
        <ListProduct title="New arrivals" sectionLabel="Just listed" products={newest} isLoading={loadingNew} />
        <ListProduct title="Best sellers" sectionLabel="Most ordered" products={popular} isLoading={loadingPopular} />
      </div>
    </div>
  )
}

export default Home
