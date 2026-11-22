import { useState } from 'react'
import type { ProductSpec, ProductSpecDetail } from '../../types/product'

interface TechnicalDetailProps {
  specs: ProductSpecDetail[]
}

const isSpecGroup = (
  detail: ProductSpecDetail
): detail is { category: string; items: ProductSpec[] } => 'items' in detail

// Thong so ky thuat cung kieu "Key Specifications": tieu de nhom nho, chi duong
// ke ngang manh, khong khung/nen; 2 cot tren man rong.
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5">
    <dt className="text-sm text-gray-500">{label}</dt>
    <dd className="text-right text-sm font-medium text-ink">{value}</dd>
  </div>
)

const TechnicalDetail = ({ specs }: TechnicalDetailProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  if (!specs?.length) {
    return <p className="text-gray-500">No technical specifications available.</p>
  }

  const toggleGroup = (category: string) =>
    setExpandedGroups(prev => ({ ...prev, [category]: !prev[category] }))

  const groups = specs.filter(isSpecGroup)
  const flat = specs.filter(d => !isSpecGroup(d)) as ProductSpec[]

  return (
    <div>
      <p className="mb-8 max-w-2xl text-sm text-gray-500">
        Full manufacturer-style specifications grouped by category. Values may vary slightly by
        region or configuration.
      </p>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
        {groups.map((detail, groupIndex) => {
          const category = detail.category || 'General'
          const isExpanded = expandedGroups[category] !== false
          const visibleItems = isExpanded ? detail.items : detail.items.slice(0, 4)
          const hasMore = detail.items.length > 4
          return (
            <section key={`${category}-${groupIndex}`}>
              <h3 className="eyebrow mb-2">{category}</h3>
              <dl className="divide-y divide-gray-200 border-y border-gray-200">
                {visibleItems.map((item, i) => (
                  <Row key={`${item.label}-${i}`} label={item.label} value={item.value} />
                ))}
              </dl>
              {hasMore && (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-ink underline-offset-4 hover:underline"
                  onClick={() => toggleGroup(category)}
                >
                  {isExpanded ? 'Show fewer' : `Show all ${detail.items.length} specs`}
                </button>
              )}
            </section>
          )
        })}
        {flat.length > 0 && (
          <section>
            <h3 className="eyebrow mb-2">General</h3>
            <dl className="divide-y divide-gray-200 border-y border-gray-200">
              {flat.map((d, i) => (
                <Row key={`${d.label}-${i}`} label={d.label} value={d.value} />
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  )
}

export default TechnicalDetail
