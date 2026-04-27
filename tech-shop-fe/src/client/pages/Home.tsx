import Hero from '../components/layout/Hero'
import Categories from '../components/products/Categories'
import ListProduct from '../components/products/ListProduct'
import { useNewProducts, usePopularProducts } from '../hooks/useProducts'

const Home = () => {
  const { data: newProduct, isLoading: loadingNew } = useNewProducts()
  const { data: popularProduct, isLoading: loadingPopular } = usePopularProducts()

  return (
    <div>
      <Hero />
      <Categories />
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
