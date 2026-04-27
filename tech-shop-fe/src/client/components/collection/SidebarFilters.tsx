import CheckboxFilter from './CheckboxFilter'
import type { DynamicFilters } from '../../pages/Collection'
import { SidebarSkeleton } from '../common/LoadingSkeleton'

type SidebarFiltersProps = {
  filters: DynamicFilters
  onFilterChange: (filterKey: string, value: string) => void
  onClearAll: () => void
  isLoading?: boolean
}

const SidebarFilters = ({
  filters,
  onFilterChange,
  onClearAll,
  isLoading = false
}: SidebarFiltersProps) => {
  // Get all filter keys from options, sorted by key for consistent display
  const filterKeys = Object.keys(filters.options).sort()

  if (isLoading) {
    return <SidebarSkeleton />
  }

  if (filterKeys.length === 0) {
    return (
      <div className="w-64 flex-shrink-0 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <div className="text-sm text-gray-500">No filters available</div>
      </div>
    )
  }

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button
          onClick={onClearAll}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* Scrollable filter content */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[calc(100vh-200px)]">
        {/* Dynamically render filters based on API data */}
        {filterKeys.map(filterKey => {
          const filterOption = filters.options[filterKey]
          const selectedValues = filters.selected[filterKey] || []

          if (
            !filterOption ||
            !filterOption.options ||
            filterOption.options.length === 0
          ) {
            return null
          }

          return (
            <CheckboxFilter
              key={filterKey}
              label={filterOption.label}
              options={filterOption.options}
              selectedValues={selectedValues}
              onChange={(value: string) => onFilterChange(filterKey, value)}
            />
          )
        })}
      </div>
    </div>
  )
}

export default SidebarFilters
