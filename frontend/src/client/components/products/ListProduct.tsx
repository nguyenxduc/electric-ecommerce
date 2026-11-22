import ProductCard from '../collection/ProductCard'
import type { ListProductRes, Product } from '../../types/product'
import { ProductGridSkeleton, SectionSkeleton } from '../common/LoadingSkeleton'
import { makeProductSlug } from '../../utils/productSlug'
import { MAX_COMPARE_PRODUCTS } from '../../constants/compare'
import SectionHeader from '../common/SectionHeader'

interface ListProductProps {
  title: string
  products: ListProductRes | null
  isLoading?: boolean
  sectionLabel?: string
  selectedCompareIds?: number[]
  onCompareToggle?: (product: Product) => void
}

const ListProduct = ({
  title,
  products,
  isLoading = false,
  sectionLabel,
  selectedCompareIds = [],
  onCompareToggle
}: ListProductProps) => {
  const DataRender = products?.products.slice(0, 4)

  return (
    <section className="mt-16">
      <SectionHeader eyebrow={sectionLabel} title={title} to="/collection/all" />

      {isLoading && (
        <>
          <SectionSkeleton />
          <ProductGridSkeleton count={4} />
        </>
      )}

      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {DataRender?.map(product => (
            <ProductCard
              product={product}
              key={product.id}
              slug={makeProductSlug(product.name, product.id)}
              compareSelected={selectedCompareIds.includes(product.id)}
              compareDisabled={
                selectedCompareIds.length >= MAX_COMPARE_PRODUCTS
              }
              onCompareToggle={onCompareToggle}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default ListProduct
