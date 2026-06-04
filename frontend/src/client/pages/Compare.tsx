import { useMemo, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useAiProductComparison, useCompareProducts } from '../hooks/useProducts'
import { ProductDetailSkeleton } from '../components/common/LoadingSkeleton'
import { getProductColors } from '../utils/productColors'
import { descriptionPreview } from '../utils/descriptionPreview'
import type { AiProductComparison, Product } from '../types/product'
import {
  MAX_COMPARE_PRODUCTS,
  MIN_COMPARE_PRODUCTS,
} from '../constants/compare'

const parseIds = (idsParam: string | null) => {
  if (!idsParam) return []
  return Array.from(
    new Set(
      idsParam
        .split(',')
        .map(id => Number(id.trim()))
        .filter(id => Number.isFinite(id) && id > 0)
    )
  ).slice(0, MAX_COMPARE_PRODUCTS)
}

const formatPrice = (value: unknown) => {
  const price = Number(value)
  return Number.isFinite(price) ? `$${price.toFixed(2)}` : 'N/A'
}

const getDisplayPrice = (product: Product) =>
  formatPrice(
    Number(product.final_price) > 0 ? product.final_price : product.price
  )

const getUnitPrice = (product: Product) =>
  Number(product.final_price) > 0
    ? Number(product.final_price)
    : Number(product.price)

type MetricPick = 'lowestPrice' | 'highestRating' | 'highestSold' | 'highestDiscount'

const getMetricWinners = (products: Product[], pick: MetricPick): number[] => {
  if (products.length < 2) return []

  const scores = products.map(product => {
    switch (pick) {
      case 'lowestPrice':
        return { id: product.id, value: getUnitPrice(product) }
      case 'highestRating':
        return { id: product.id, value: Number(product.rating) || 0 }
      case 'highestSold':
        return { id: product.id, value: Number(product.sold) || 0 }
      case 'highestDiscount':
        return { id: product.id, value: Number(product.discount) || 0 }
      default:
        return { id: product.id, value: 0 }
    }
  })

  const best =
    pick === 'lowestPrice'
      ? Math.min(...scores.map(s => s.value))
      : Math.max(...scores.map(s => s.value))

  const winners = scores.filter(s => s.value === best).map(s => s.id)
  return winners.length < scores.length ? winners : []
}

const HIGHLIGHT_CELL =
  'rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200'

const PAGE_MAX_WIDTH = 'max-w-7xl'

const getProductGridClass = (count: number) => {
  if (count <= 2) return 'grid-cols-1 sm:grid-cols-2'
  if (count === 3) return 'grid-cols-1 sm:grid-cols-3'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
}

type ComparePanelProps = {
  title: string
  description: string
  onAction?: () => void
}

const ComparePanel = ({ title, description, onAction }: ComparePanelProps) => (
  <div className="flex min-h-[70vh] items-center justify-center bg-white px-4 py-16">
    <div className="w-full max-w-md text-center">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </button>
      )}
    </div>
  </div>
)

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
      <ComparePanel
        title="Compare products"
        description={`Choose ${MIN_COMPARE_PRODUCTS}–${MAX_COMPARE_PRODUCTS} items from the shop, then tap Compare now.`}
        onAction={handleBack}
      />
    )
  }

  if (isLoading) return <ProductDetailSkeleton />

  if (error || !products || products.length < 2) {
    return (
      <ComparePanel
        title="Could not load products"
        description="Please update your selection and try again."
        onAction={handleBack}
      />
    )
  }

  if (!hasSameCategory) {
    return (
      <ComparePanel
        title="Same category only"
        description="Pick products from one category to compare them side by side."
        onAction={handleBack}
      />
    )
  }

  if (isComparisonLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Building your comparison…</p>
      </div>
    )
  }

  if (comparisonError || !comparison) {
    return (
      <ComparePanel
        title="Comparison unavailable"
        description="Please try again in a moment."
        onAction={handleBack}
      />
    )
  }

  return (
    <CompareContent
      products={products}
      comparison={comparison}
      onBack={handleBack}
    />
  )
}

type CompareContentProps = {
  products: Product[]
  comparison: AiProductComparison
  onBack: () => void
}

const CompareContent = ({ products, comparison, onBack }: CompareContentProps) => {
  const bestChoiceId = comparison.best_choice.product_id
  const bestChoice = products.find(product => product.id === bestChoiceId)
  const productGridClass = getProductGridClass(products.length)

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className={`mx-auto w-full ${PAGE_MAX_WIDTH} px-4 sm:px-6 lg:px-8`}>
        <header className="border-b border-gray-100 py-8 text-left">
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Change products
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Compare
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {products.length} products · same category
          </p>
        </header>

        <section className="mt-10 text-left">
          {comparison.summary && (
            <p className="max-w-3xl text-[15px] leading-7 text-gray-700">
              {comparison.summary}
            </p>
          )}

          <div
            className={`mt-8 grid w-full gap-6 ${productGridClass}`}
          >
            {products.map(product => {
              const overview =
                comparison.product_overviews?.find(
                  item => item.product_id === product.id
                )?.overview ||
                (product.description
                  ? descriptionPreview(product.description, 320)
                  : '') ||
                '—'
              const isPick = product.id === bestChoiceId

              return (
                <div
                  key={product.id}
                  className={`rounded-2xl border p-6 sm:p-7 ${
                    isPick
                      ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-semibold text-gray-900">
                      {product.name}
                    </h2>
                    <span
                      className={`text-sm font-semibold ${
                        getMetricWinners(products, 'lowestPrice').includes(
                          product.id
                        ) || isPick
                          ? 'rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-900'
                          : 'text-gray-900'
                      }`}
                    >
                      {getDisplayPrice(product)}
                    </span>
                  </div>
                  {isPick && (
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-700">
                      Top pick
                    </p>
                  )}
                  <p className="mt-4 text-sm leading-7 text-gray-700">
                    {overview}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-xs">
                    <div>
                      <dt className="text-gray-500">Rating</dt>
                      <dd
                        className={`mt-0.5 font-semibold ${
                          getMetricWinners(products, 'highestRating').includes(
                            product.id
                          )
                            ? 'text-emerald-800'
                            : 'text-gray-900'
                        }`}
                      >
                        {Number(product.rating) > 0
                          ? Number(product.rating).toFixed(1)
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Sold</dt>
                      <dd
                        className={`mt-0.5 font-semibold ${
                          getMetricWinners(products, 'highestSold').includes(
                            product.id
                          )
                            ? 'text-emerald-800'
                            : 'text-gray-900'
                        }`}
                      >
                        {product.sold ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Discount</dt>
                      <dd
                        className={`mt-0.5 font-semibold ${
                          getMetricWinners(products, 'highestDiscount').includes(
                            product.id
                          )
                            ? 'text-emerald-800'
                            : 'text-gray-900'
                        }`}
                      >
                        {Number(product.discount) > 0
                          ? `${product.discount}%`
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>

          {comparison.recommendation && (
            <p className="mt-8 max-w-3xl text-[15px] leading-7 text-gray-600">
              {comparison.recommendation}
            </p>
          )}

          {!!comparison.key_differences?.length && (
            <div className="mt-8 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Key differences
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                {comparison.key_differences.map(item => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 max-w-2xl rounded-xl border border-gray-200 bg-gray-50 px-6 py-4 sm:px-8">
            <p className="text-xs font-medium text-gray-500">
              Suggested for most shoppers
            </p>
            <p className="mt-1 font-semibold text-gray-900">
              {bestChoice?.name || '—'}
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              {comparison.best_choice.reason}
            </p>
          </div>
        </section>

        {/* Product cards */}
        <div className={`mt-12 grid w-full gap-6 lg:gap-8 ${productGridClass}`}>
          {products.map(product => {
            const assessment = comparison.product_assessments.find(
              item => item.product_id === product.id
            )
            const isPick = product.id === bestChoiceId

            return (
              <article
                key={product.id}
                className={`flex w-full flex-col rounded-2xl border bg-white p-6 sm:p-8 ${
                  isPick ? 'border-gray-900' : 'border-gray-200'
                }`}
              >
                <div className="mx-auto flex h-40 w-full items-center justify-center sm:h-44">
                  <img
                    src={product.img?.[0] || ''}
                    alt={product.name}
                    className="max-h-full max-w-[240px] object-contain sm:max-w-[280px]"
                  />
                </div>
                <h2 className="mt-4 text-center text-base font-semibold text-gray-900">
                  {product.name}
                </h2>
                <p className="mt-1 text-center text-lg font-semibold text-gray-900">
                  {getDisplayPrice(product)}
                </p>
                {isPick && (
                  <p className="mt-2 text-center text-xs font-medium text-gray-500">
                    Top pick
                  </p>
                )}
                {assessment?.verdict && (
                  <p className="mt-3 text-center text-sm leading-6 text-gray-600">
                    {assessment.verdict}
                  </p>
                )}

                <div className="mt-6 space-y-5 border-t border-gray-100 pt-5 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Ideal for</p>
                    <p className="mt-1 leading-6 text-gray-600">
                      {assessment?.best_for || 'General use'}
                    </p>
                  </div>
                  {!!assessment?.strengths.length && (
                    <div>
                      <p className="font-medium text-gray-900">Pros</p>
                      <ul className="mt-1.5 space-y-1 text-gray-600">
                        {assessment.strengths.map(item => (
                          <li key={item} className="leading-6">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!assessment?.limitations.length && (
                    <div>
                      <p className="font-medium text-gray-900">Cons</p>
                      <ul className="mt-1.5 space-y-1 text-gray-600">
                        {assessment.limitations.map(item => (
                          <li key={item} className="leading-6">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <section className="mt-14 w-full">
          <h2 className="mb-6 text-left text-lg font-semibold text-gray-900">
            Specifications
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table
              className="w-full table-fixed"
              style={{
                minWidth: `${160 + products.length * 200}px`
              }}
            >
              <colgroup>
                <col style={{ width: '28%' }} />
                {products.map(product => (
                  <col
                    key={product.id}
                    style={{ width: `${72 / products.length}%` }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500">
                    &nbsp;
                  </th>
                  {products.map(product => {
                    const isPick = product.id === bestChoiceId
                    return (
                      <th
                        key={product.id}
                        className={`px-4 py-4 text-center text-sm font-semibold ${
                          isPick ? 'bg-emerald-50/80 text-emerald-900' : 'text-gray-900'
                        }`}
                      >
                        <span className="line-clamp-2">{product.name}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <CompareTableRow
                  label="Price"
                  products={products}
                  winnerIds={getMetricWinners(products, 'lowestPrice')}
                  renderValue={product => getDisplayPrice(product)}
                />
                <CompareTableRow
                  label="Rating"
                  products={products}
                  winnerIds={getMetricWinners(products, 'highestRating')}
                  renderValue={product =>
                    Number(product.rating) > 0
                      ? `${Number(product.rating).toFixed(1)} / 5`
                      : '—'
                  }
                />
                <CompareTableRow
                  label="Units sold"
                  products={products}
                  winnerIds={getMetricWinners(products, 'highestSold')}
                  renderValue={product =>
                    Number(product.sold) > 0 ? String(product.sold) : '—'
                  }
                />
                <CompareTableRow
                  label="Discount"
                  products={products}
                  winnerIds={getMetricWinners(products, 'highestDiscount')}
                  renderValue={product =>
                    Number(product.discount) > 0
                      ? `${Number(product.discount)}%`
                      : '—'
                  }
                />
                <CompareTableRow
                  label="Colors"
                  products={products}
                  renderValue={product =>
                    getProductColors(product.available_colors, product.color)
                      .map(color => color.name)
                      .join(', ') || '—'
                  }
                />
                {comparison.rows.map(row => (
                  <CompareTableRow
                    key={row.feature}
                    label={row.feature}
                    hint={row.insight}
                    products={products}
                    winnerIds={
                      row.winner_product_id != null
                        ? [row.winner_product_id]
                        : []
                    }
                    renderValue={product =>
                      row.values.find(value => value.product_id === product.id)
                        ?.value || '—'
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

type CompareTableRowProps = {
  label: string
  hint?: string
  products: Product[]
  winnerIds?: number[]
  renderValue: (product: Product) => ReactNode
}

const CompareTableRow = ({
  label,
  hint,
  products,
  winnerIds = [],
  renderValue
}: CompareTableRowProps) => (
  <tr>
    <th className="px-4 py-4 text-left align-top">
      <div className="text-sm font-medium text-gray-900">{label}</div>
      {hint && (
        <p className="mt-1 text-xs leading-5 text-gray-500">{hint}</p>
      )}
    </th>
    {products.map(product => {
      const isWinner = winnerIds.includes(product.id)
      return (
        <td
          key={product.id}
          className="px-4 py-4 text-center align-top text-sm text-gray-700"
        >
          <span className={isWinner ? HIGHLIGHT_CELL : 'inline-block'}>
            {renderValue(product)}
          </span>
        </td>
      )
    })}
  </tr>
)

export default Compare
