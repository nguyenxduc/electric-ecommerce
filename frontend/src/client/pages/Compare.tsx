import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAiProductComparison, useCompareProducts } from '../hooks/useProducts'
import { ProductDetailSkeleton } from '../components/common/LoadingSkeleton'
import { getProductColors } from '../utils/productColors'

const MIN_COMPARE_PRODUCTS = 2
const MAX_COMPARE_PRODUCTS = 4

const parseIds = (idsParam: string | null) => {
  if (!idsParam) return []
  return Array.from(
    new Set(
      idsParam
        .split(',')
        .map(id => Number(id.trim()))
        .filter(id => Number.isFinite(id) && id > 0)
    )
  )
}

const formatPrice = (value: unknown) => {
  const price = Number(value)
  return Number.isFinite(price) ? `$${price.toFixed(2)}` : 'N/A'
}

const Compare = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ids = useMemo(() => parseIds(searchParams.get('ids')), [searchParams])
  const hasValidSelection =
    ids.length >= MIN_COMPARE_PRODUCTS && ids.length <= MAX_COMPARE_PRODUCTS
  const { data: products, isLoading, error } = useCompareProducts(
    ids,
    hasValidSelection
  )
  const hasSameCategory =
    !!products &&
    products.length > 0 &&
    products.every(product => product.category_id === products[0].category_id)
  const {
    data: comparison,
    isLoading: isComparisonLoading,
    error: comparisonError
  } = useAiProductComparison(
    ids,
    hasValidSelection && products?.length === ids.length && hasSameCategory
  )

  const handleBack = () => {
    navigate('/collection/all')
  }

  if (!hasValidSelection) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Compare products</h1>
          <p className="text-gray-600 mb-6">
            Select between {MIN_COMPARE_PRODUCTS} and {MAX_COMPARE_PRODUCTS} products from the collection page to compare.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to products
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <ProductDetailSkeleton />
  }

  if (error || !products || products.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Compare products</h1>
          <p className="text-gray-600 mb-6">Unable to load the selected products. Try again or update your selection.</p>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to products
          </button>
        </div>
      </div>
    )
  }

  if (!hasSameCategory) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Compare products</h1>
          <p className="text-gray-600 mb-6">
            Only products from the same category can be compared. Update your selection and try again.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to products
          </button>
        </div>
      </div>
    )
  }

  if (isComparisonLoading) {
    return <ProductDetailSkeleton />
  }

  if (comparisonError || !comparison) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">AI comparison unavailable</h1>
          <p className="text-gray-600 mb-6">
            The shopping assistant could not compare these products. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to products
          </button>
        </div>
      </div>
    )
  }

  const bestChoice = products.find(
    product => product.id === comparison.best_choice.product_id
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Compare products</h1>
            <p className="mt-2 text-sm text-gray-600">
              AI-assisted comparison for {products.length} products from the same category.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-blue-600 border border-blue-200 shadow-sm transition hover:bg-blue-50"
          >
            Update selection
          </button>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">AI summary</h2>
            <p className="mt-2 text-sm leading-6 text-blue-950">{comparison.summary}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">AI recommendation</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-950">{comparison.recommendation}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Best choice</h2>
            <p className="mt-2 text-sm font-semibold text-amber-950">
              {bestChoice?.name || 'Recommended product'}
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-950">{comparison.best_choice.reason}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {products.map(product => {
            const assessment = comparison.product_assessments.find(
              item => item.product_id === product.id
            )

            return (
              <article key={product.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">{product.name}</h2>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue-700">Best for</p>
                <p className="mt-1 text-sm text-gray-700">{assessment?.best_for || 'General use'}</p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                {assessment?.strengths.length ? (
                  <ul className="mt-1 space-y-1 text-sm text-gray-700">
                    {assessment.strengths.map(strength => (
                      <li key={strength}>- {strength}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">No notable strengths provided.</p>
                )}

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-700">Limitations</p>
                {assessment?.limitations.length ? (
                  <ul className="mt-1 space-y-1 text-sm text-gray-700">
                    {assessment.limitations.map(limitation => (
                      <li key={limitation}>- {limitation}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">No notable limitations provided.</p>
                )}
              </article>
            )
          })}
        </div>

        <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Attribute
                </th>
                {products.map(product => (
                  <th
                    key={product.id}
                    className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {product.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              <tr>
                <th className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">Image</th>
                {products.map(product => (
                  <td key={product.id} className="px-6 py-4">
                    <img
                      src={product.img?.[0] || ''}
                      alt={product.name}
                      className="h-28 w-full max-w-[160px] rounded-xl object-cover"
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <th className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">Price</th>
                {products.map(product => (
                  <td key={product.id} className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {formatPrice(Number(product.final_price) > 0 ? product.final_price : product.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">Colors</th>
                {products.map(product => (
                  <td key={product.id} className="px-6 py-4 text-sm text-gray-700">
                    {getProductColors(product.available_colors, product.color)
                      .map(color => color.name)
                      .join(', ') || 'N/A'}
                  </td>
                ))}
              </tr>
              {comparison.rows.map(row => (
                <tr key={row.feature}>
                  <th className="min-w-[180px] px-6 py-4 text-left text-sm font-medium text-gray-900">
                    <div>{row.feature}</div>
                    {row.insight && (
                      <p className="mt-1 text-xs font-normal leading-5 text-gray-500">{row.insight}</p>
                    )}
                  </th>
                  {products.map(product => (
                    <td key={product.id} className="px-6 py-4 text-sm text-gray-700">
                      {row.values.find(value => value.product_id === product.id)?.value || 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Compare
