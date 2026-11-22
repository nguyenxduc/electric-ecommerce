import Hero from '../components/layout/Hero'
import Categories from '../components/products/Categories'
import FeaturedShops from '../components/layout/FeaturedShops'
import FlashSale from '../components/layout/FlashSale'
import RecentlyViewed from '../components/products/RecentlyViewed'
import TopDeals from '../components/layout/TopDeals'
import ListProduct from '../components/products/ListProduct'
import { useHomeRecommendations, useNewProducts, usePopularProducts } from '../hooks/useProducts'
import { recommendationStrategyLabel } from '../utils/recommendationLabel'
import type { ListProductRes } from '../types/product'

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

  return (
    <div>
      <Hero />
      <Categories />
      <FlashSale />
      <TopDeals />
      <FeaturedShops />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <RecentlyViewed canClear />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-6">
        <ListProduct
          title="Recommended for you"
          sectionLabel={recommendationStrategyLabel(recommendationData?.data?.strategy)}
          products={recommendationProducts}
          isLoading={loadingRecommendation}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-6">
        <ListProduct title="New Arrivals" products={newProduct || null} isLoading={loadingNew} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-6">
        <ListProduct title="Best Sellers" products={popularProduct || null} isLoading={loadingPopular} />
      </div>
    </div>
  )
}

export default Home
