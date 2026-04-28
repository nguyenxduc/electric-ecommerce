import { useState, useEffect, useMemo, useCallback } from 'react'
import CategoryNav from '../components/collection/CategoryNav'
import FilterTagsBar from '../components/collection/FilterTagsBar'
import SidebarFilters from '../components/collection/SidebarFilters'
import SortDropdown from '../components/collection/SortDropdown'
import ProductGrid from '../components/collection/ProductGrid'
import Pagination from '../components/collection/Pagination'
import ListProduct from '../components/products/ListProduct'
import {
  ProductGridSkeleton,
  SectionSkeleton
} from '../components/common/LoadingSkeleton'

import { useCollectionProducts, useHomeRecommendations, useSearchProducts } from '../hooks/useProducts'
import { useCategories, useCategoryBySlug } from '../hooks/useCategories'
import { useFilters } from '../hooks/useFilters'
import { ListProductRes } from '../types/product'
import { recommendationStrategyLabel } from '../utils/recommendationLabel'

import { useParams, useSearchParams } from 'react-router-dom'

// Dynamic filter type - key is the filter key from API, value is array of selected values
export type DynamicFilters = {
  selected: Record<string, string[]> // key: filter key (e.g., 'brand', 'ram'), value: selected values
  options: Record<string, { key: string; label: string; options: string[] }> // key: filter key, value: filter metadata
}

const Collection = () => {
  const { collection } = useParams<{ collection: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get category data by slug (if not 'all')
  const { data: categoryData, isLoading: isCategoryLoading } =
    useCategoryBySlug(collection || '')
  const categoryId = categoryData?.id ? Number(categoryData.id) : undefined

  // Determine the collection parameter for products API
  const collectionParam = useMemo(() => {
    if (collection === 'all') return 'all'
    if (categoryId) return categoryId.toString()
    // If we're loading category data, don't make products call yet
    if (collection && collection !== 'all' && isCategoryLoading) return null
    return 'all' // fallback
  }, [collection, categoryId, isCategoryLoading])

  // Get parameters from URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const sortBy = searchParams.get('sort') || 'featured'
  const searchQuery = useMemo(
    () => (searchParams.get('search') || '').trim(),
    [searchParams]
  )

  // Fetch categories and filters from API
  const { data: categoriesData } = useCategories()
  // Only pass categoryId if we're not on "All" collection
  // This ensures global filters only show on "All" collection
  const { data: filtersData, isLoading: isLoadingFilters } = useFilters(
    collection === 'all' ? undefined : categoryId
  )

  // Map filter data from API to dynamic format
  const filterOptions = useMemo(() => {
    let filterArray: any[] = []

    if (filtersData) {
      if (filtersData.success && Array.isArray(filtersData.data)) {
        filterArray = filtersData.data
      } else if (Array.isArray(filtersData.data)) {
        filterArray = filtersData.data
      } else if (Array.isArray(filtersData)) {
        filterArray = filtersData
      }
    }

    // Build dynamic filter options map
    const options: Record<
      string,
      { key: string; label: string; options: string[] }
    > = {}

    filterArray.forEach((item: any) => {
      if (!item || typeof item !== 'object') return

      const key = item.key || ''
      const label =
        item.label ||
        key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      const values = Array.isArray(item.options) ? item.options : []

      if (values.length === 0) return

      // Use the key as the identifier (normalize to lowercase for consistency)
      const normalizedKey = key.toLowerCase()
      if (!options[normalizedKey]) {
        options[normalizedKey] = {
          key: normalizedKey,
          label: label,
          options: values
        }
      } else {
        // Merge options if key already exists
        const existing = options[normalizedKey]
        existing.options = [...new Set([...existing.options, ...values])]
      }
    })

    return options
  }, [filtersData])

  // Initialize filters from URL parameters
  const getFiltersFromURL = useCallback(() => {
    const selected: Record<string, string[]> = {}
    const tags: string[] = []

    // Parse filter parameters from URL
    searchParams.forEach((value, key) => {
      // Skip non-filter parameters
      if (['page', 'sort', 'search'].includes(key)) return

      // URLSearchParams already decodes values, no need to decode again
      const values = value.split(',').filter(v => v.trim())
      if (values.length > 0) {
        selected[key] = values
        tags.push(...values)
      }
    })

    return { selected, tags }
  }, [searchParams])

  const [filters, setFilters] = useState<DynamicFilters>(() => {
    const { selected } = getFiltersFromURL()
    return {
      selected,
      options: {}
    }
  })

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const { tags } = getFiltersFromURL()
    return tags
  })

  // Update filter options when API data changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      options: filterOptions
    }))
  }, [filterOptions])

  // Update filters when URL changes
  useEffect(() => {
    const { selected, tags } = getFiltersFromURL()
    setFilters(prev => ({
      ...prev,
      selected
    }))
    setSelectedTags(tags)
  }, [getFiltersFromURL])

  // Map categories from API to CategoryNav format with "All" option
  const categories = useMemo(() => {
    const allCategory = {
      id: 0, // Use 0 or 'all' as identifier for all products
      name: 'All',
      image_url: '' // You can add an icon for "All" if needed
    }

    if (!categoriesData || categoriesData.length === 0) return [allCategory]

    const mappedCategories = categoriesData.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image_url: cat.image_url
    }))

    return [allCategory, ...mappedCategories]
  }, [categoriesData])

  const sortOptions = [
    { value: 'featured', label: 'featured' },
    { value: 'price-asc', label: 'Price: ascending' },
    { value: 'price-desc', label: 'Price: descending' },
    { value: 'newest', label: 'New Arrivals' }
  ]

  const mappedSort = useMemo(() => {
    switch (sortBy) {
      case 'price-asc':
        return 'price-asc'
      case 'price-desc':
        return 'price-desc'
      case 'newest':
        return 'newest'
      default:
        return 'popular'
    }
  }, [sortBy])

  const [filterString, setFilterString] = useState<string>('')
  const [products, setProducts] = useState<ListProductRes>()
  const { data: allProducts, isLoading } = useCollectionProducts(
    collectionParam || 'all',
    sortBy,
    filterString,
    currentPage,
    12,
    !!collectionParam // enable query only if collectionParam exists
  )

  const { data: searchResults, isLoading: isSearching } = useSearchProducts(
    searchQuery,
    {
      sort: mappedSort as any,
      page: currentPage,
      limit: 15,
      category_id: categoryId
    }
  )
  const { data: recommendationData, isLoading: recommendationLoading } =
    useHomeRecommendations({
      limit: 8,
      category_id: collection === 'all' ? undefined : categoryId,
      enabled: !searchQuery && collection !== 'all'
    })

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

  // Update URL when page changes
  const setCurrentPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    setSearchParams(params)
  }

  // Update URL when sort changes
  const setSortBy = (newSort: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('sort', newSort)
    params.set('page', '1') // Reset to first page when sorting changes
    setSearchParams(params)
  }

  useEffect(() => {
    if (searchQuery) {
      const params = new URLSearchParams(searchParams)
      params.set('page', '1')
      setSearchParams(params)
    }
  }, [searchQuery, searchParams, setSearchParams])

  useEffect(() => {
    const source = searchQuery ? searchResults : allProducts
    if (source) {
      setProducts(source)
    }
  }, [allProducts, searchResults, searchQuery])

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  // Dynamic filter string converter
  const convertFilterArrayToString = useCallback(() => {
    const filterParts: string[] = []

    Object.keys(filters.selected).forEach(filterKey => {
      const selectedValues = filters.selected[filterKey]
      if (selectedValues && selectedValues.length > 0) {
        // Properly encode each value to handle special characters like + and spaces
        const encodedValues = selectedValues.map(value =>
          encodeURIComponent(value)
        )
        const filterPart = `${filterKey}=${encodedValues.join(',')}`
        filterParts.push(filterPart)
      }
    })

    const result = filterParts.join('&')

    return result
  }, [filters.selected])

  // Update filter string when URL changes
  useEffect(() => {
    const newFilterString = convertFilterArrayToString()
    setFilterString(newFilterString)
  }, [convertFilterArrayToString])

  // Dynamic filter change handler - updates URL
  const handleFilterChange = (filterKey: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    const currentValues =
      params
        .get(filterKey)
        ?.split(',')
        .filter(v => v.trim()) || []

    let newValues: string[]
    if (currentValues.includes(value)) {
      // Remove value
      newValues = currentValues.filter(v => v !== value)
    } else {
      // Add value
      newValues = [...currentValues, value]
    }

    // Update URL parameters
    if (newValues.length > 0) {
      params.set(filterKey, newValues.join(','))
    } else {
      params.delete(filterKey)
    }

    // Reset to page 1 when filters change
    params.set('page', '1')

    setSearchParams(params)
  }

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams)

    // Remove all filter parameters (keep page, sort, search)
    const keysToKeep = ['page', 'sort', 'search']
    const newParams = new URLSearchParams()

    keysToKeep.forEach(key => {
      const value = params.get(key)
      if (value) {
        newParams.set(key, value)
      }
    })

    // Reset to page 1
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const removeTag = (tag: string) => {
    const params = new URLSearchParams(searchParams)

    // Find and remove tag from all filter parameters
    let found = false
    params.forEach((value, key) => {
      if (['page', 'sort', 'search'].includes(key)) return

      const values = value.split(',').filter(v => v.trim())
      if (values.includes(tag)) {
        const newValues = values.filter(v => v !== tag)
        if (newValues.length > 0) {
          params.set(key, newValues.join(','))
        } else {
          params.delete(key)
        }
        found = true
      }
    })

    if (found) {
      // Reset to page 1 when removing filter
      params.set('page', '1')
      setSearchParams(params)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {categories.length > 0 && <CategoryNav categories={categories} />}
      <FilterTagsBar tags={selectedTags} onRemoveTag={removeTag} />

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-8">
        {(isLoadingFilters || Object.keys(filters.options).length > 0) && (
          <SidebarFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAll}
            isLoading={isLoadingFilters}
          />
        )}

        <div
          className={`flex-1 ${
            !(isLoadingFilters || Object.keys(filters.options).length > 0)
              ? 'max-w-none'
              : ''
          }`}
        >
          {!searchQuery &&
          collection !== 'all' &&
          (recommendationLoading || recommendationProducts?.products?.length) ? (
            <ListProduct
              title="Gợi ý theo danh mục"
              sectionLabel={recommendationStrategyLabel(recommendationData?.data?.strategy)}
              products={recommendationProducts}
              isLoading={recommendationLoading}
            />
          ) : null}

          <div className="flex justify-end mb-6">
            <SortDropdown
              options={sortOptions}
              selected={sortBy}
              onSelect={setSortBy}
            />
          </div>

          {(searchQuery ? isSearching : isLoading) && (
            <div className="space-y-4">
              <SectionSkeleton />
              <ProductGridSkeleton count={9} />
            </div>
          )}

          {!(searchQuery ? isSearching : isLoading) && products && (
            <>
              {products.products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No products found
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-gray-600">
                    Showing{' '}
                    {products.pagination
                      ? `${
                          (products.pagination.current_page - 1) *
                            products.pagination.per_page +
                          1
                        }-${Math.min(
                          products.pagination.current_page *
                            products.pagination.per_page,
                          products.pagination.total_count
                        )} of ${products.pagination.total_count} products`
                      : `${products.products.length} products`}
                  </div>
                  <ProductGrid products={products.products} />

                  {/* Pagination - Always show if we have pagination data */}
                  {products.pagination &&
                    products.pagination.total_pages > 1 && (
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={products.pagination.total_pages}
                          onPageChange={setCurrentPage}
                          total={products.pagination.total_count}
                          pageSize={products.pagination.per_page}
                        />
                      </div>
                    )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Collection
