import { useNavigate } from 'react-router-dom'
import ProductCard from '../collection/ProductCard'
import type { ListProductRes, Product } from '../../types/product'
import { ProductGridSkeleton, SectionSkeleton } from '../common/LoadingSkeleton'
import { makeProductSlug } from '../../utils/productSlug'

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
  const navigate = useNavigate()

  function onClick(id: number) {
    navigate(`/product/${id}`)
  }

  function ViewAll() {
    navigate('/collection/all')
  }

  const DataRender = products?.products.slice(0, 4)

  return (
    <section className="mb-10 mt-5">
      <div className="mx-2 mb-4 flex items-center justify-between border-b border-b-black py-2">
        <div className="mb-4">
          <h2 className="text-3xl font-semibold">{title}</h2>
          {sectionLabel && (
            <p className="mt-1 text-sm text-gray-500">{sectionLabel}</p>
          )}
        </div>
        <button onClick={ViewAll} className="text-sm text-blue-600 hover:underline">
          View All
        </button>
      </div>

      {isLoading && (
        <>
          <SectionSkeleton />
          <ProductGridSkeleton count={4} />
        </>
      )}

      {!isLoading && (
        <div className="grid grid-cols-4 gap-6">
          {DataRender?.map(product => (
            <ProductCard
              product={product}
              key={product.id}
              slug={makeProductSlug(product.name, product.id)}
              compareSelected={selectedCompareIds.includes(product.id)}
              compareDisabled={selectedCompareIds.length >= 4}
              onCompareToggle={onCompareToggle}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default ListProduct
