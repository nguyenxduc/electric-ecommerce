import { useState } from 'react'
import type { ProductSpec, ProductSpecDetail } from '../../types/product'

interface TechnicalDetailProps {
  specs: ProductSpecDetail[]
}

const isSpecGroup = (
  detail: ProductSpecDetail
): detail is { category: string; items: ProductSpec[] } => 'items' in detail

const TechnicalDetail = ({ specs }: TechnicalDetailProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  )

  if (!specs?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-500">
        No technical specifications available.
      </div>
    )
  }

  const toggleGroup = (category: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 lg:p-8">
      <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-2">
        Technical Details
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Full manufacturer-style specifications grouped by category. Values may
        vary slightly by region or configuration.
      </p>

      <div className="space-y-6">
        {specs.map((detail, groupIndex) => {
          if (isSpecGroup(detail)) {
            const category = detail.category || 'General'
            const isExpanded = expandedGroups[category] !== false
            const visibleItems = isExpanded
              ? detail.items
              : detail.items.slice(0, 4)
            const hasMore = detail.items.length > 4

            return (
              <section
                key={`${category}-${groupIndex}`}
                className="rounded-lg border border-gray-100 overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-gray-900">
                    {category}
                  </h3>
                </div>
                <dl className="divide-y divide-gray-100">
                  {visibleItems.map((item, i) => (
                    <div
                      key={`${item.label}-${i}`}
                      className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 py-3 px-4 even:bg-gray-50/80"
                    >
                      <dt className="text-sm text-gray-600 font-medium sm:w-1/3">
                        {item.label}
                      </dt>
                      <dd className="text-sm text-gray-900 sm:w-2/3 sm:text-right font-medium">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {hasMore && (
                  <button
                    type="button"
                    className="w-full py-2.5 text-sm text-blue-600 hover:text-blue-700 font-medium border-t border-gray-100 bg-white"
                    onClick={() => toggleGroup(category)}
                  >
                    {isExpanded
                      ? 'Show fewer specs in this section'
                      : `Show all ${detail.items.length} specs in ${category}`}
                  </button>
                )}
              </section>
            )
          }

          return (
            <dl
              key={`flat-${groupIndex}`}
              className="rounded-lg border border-gray-100 divide-y divide-gray-100"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 px-4 bg-gray-50/80">
                <dt className="text-sm text-gray-600 font-medium">
                  {detail.label}
                </dt>
                <dd className="text-sm text-gray-900 font-medium">
                  {detail.value}
                </dd>
              </div>
            </dl>
          )
        })}
      </div>
    </div>
  )
}

export default TechnicalDetail
