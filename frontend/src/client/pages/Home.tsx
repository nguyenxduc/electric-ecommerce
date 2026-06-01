import Hero from '../components/layout/Hero'
import Categories from '../components/products/Categories'
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
      <div className="px-12">
        <ListProduct
          title="Recommended for you"
          sectionLabel={recommendationStrategyLabel(recommendationData?.data?.strategy)}
          products={recommendationProducts}
          isLoading={loadingRecommendation}
        />
      </div>
      <div className="px-12">
        <ListProduct title="New Product" products={newProduct || null} isLoading={loadingNew} />
      </div>
      <div className="px-12">
        <ListProduct title="Best Seller" products={popularProduct || null} isLoading={loadingPopular} />
      </div>
    </div>
  )
}

export default Home
