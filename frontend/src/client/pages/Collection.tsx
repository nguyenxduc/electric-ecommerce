import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import CategoryNav from '../components/collection/CategoryNav'
import SidebarFilters from '../components/collection/SidebarFilters'
import SortDropdown from '../components/collection/SortDropdown'
import ProductGrid from '../components/collection/ProductGrid'
import Pagination from '../components/collection/Pagination'
import {
  ProductGridSkeleton,
  SectionSkeleton
} from '../components/common/LoadingSkeleton'

import { toast } from 'sonner'
import { useCollectionProducts, useSearchProducts } from '../hooks/useProducts'
import { useCategories, useCategoryBySlug } from '../hooks/useCategories'
import { useFilters } from '../hooks/useFilters'
import { ListProductRes, Product } from '../types/product'
import { COLLECTION_PAGE_SIZE } from '../services/productService'
import { shouldShowPagination } from '../utils/normalizeProductList'
import {
  MAX_COMPARE_PRODUCTS,
  MIN_COMPARE_PRODUCTS,
} from '../constants/compare'

import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'

// Dynamic filter type - key is the filter key from API, value is array of selected values
export type DynamicFilters = {
  selected: Record<string, string[]> // key: filter key (e.g., 'brand', 'ram'), value: selected values
  options: Record<string, { key: string; label: string; options: string[] }> // key: filter key, value: filter metadata
}

type FilterItem = { key?: string; label?: string; options?: string[] }

const Collection = () => {
  const { collection } = useParams<{ collection: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  // Danh sach category (da tai cho thanh CategoryNav) du de doi slug -> id ngay,
  // khong phai cho /categories/slug. Truoc day trong luc cho, san pham roi ve
  // 'all' va sidebar thanh skeleton: doi category lan dau thay nhay "All" roi
  // moi ra dung category (lan sau co cache nen khong bi).
  const { data: categoriesData } = useCategories()
  const listCategory = useMemo(
    () =>
      collection && collection !== 'all'
        ? categoriesData?.find(c => c.slug === collection || String(c.id) === collection)
        : undefined,
    [categoriesData, collection]
  )

  // Get category data by slug (if not 'all') - chi con la duong du phong
  const { data: categoryData, isLoading: isCategoryBySlugLoading } =
    useCategoryBySlug(listCategory ? '' : collection || '')
  const categoryId = listCategory
    ? Number(listCategory.id)
    : categoryData?.id
    ? Number(categoryData.id)
    : undefined
  const isCategoryLoading = !listCategory && isCategoryBySlugLoading

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

  // Fetch filters from API
  // Only pass categoryId if we're not on "All" collection
  // This ensures global filters only show on "All" collection
  const { data: filtersData, isLoading: isLoadingFilters, isPlaceholderData: isFiltersStale } = useFilters(
    collection === 'all' ? undefined : categoryId
  )

  // Map filter data from API to dynamic format
  const filterOptions = useMemo(() => {
    let filterArray: FilterItem[] = []

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

    filterArray.forEach(item => {
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

  const [showFilters, setShowFilters] = useState(false)
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
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'newest', label: 'Newest' },
    { value: 'discount', label: 'Biggest discount' }
  ]

  const mappedSort = useMemo(() => {
    switch (sortBy) {
      case 'price-asc':
        return 'price-asc'
      case 'price-desc':
        return 'price-desc'
      case 'newest':
        return 'newest'
      case 'discount':
        return 'discount'
      default:
        return 'popular'
    }
  }, [sortBy])

  const [filterString, setFilterString] = useState<string>('')
  const [products, setProducts] = useState<ListProductRes>()
  const [compareProducts, setCompareProducts] = useState<Product[]>([])
  const compareIds = compareProducts
    .map(product => Number(product.id))
    .filter(id => Number.isSafeInteger(id) && id > 0)
  const compareCategoryId = compareProducts[0]?.category_id

  const productsFetchCategory = useMemo(() => {
    if (compareIds.length > 0 && compareCategoryId != null) {
      return String(compareCategoryId)
    }
    return collectionParam || 'all'
  }, [compareIds.length, compareCategoryId, collectionParam])

  const compareCategoryName = useMemo(() => {
    if (compareCategoryId == null || !categoriesData?.length) return null
    const match = categoriesData.find(
      cat => Number(cat.id) === Number(compareCategoryId)
    )
    return match?.name ?? null
  }, [compareCategoryId, categoriesData])

  const { data: allProducts, isLoading, isPlaceholderData: isCollectionStale } = useCollectionProducts(
    productsFetchCategory,
    sortBy,
    filterString,
    currentPage,
    COLLECTION_PAGE_SIZE,
    !!collectionParam // enable query only if collectionParam exists
  )

  const { data: searchResults, isLoading: isSearching, isPlaceholderData: isSearchStale } = useSearchProducts(
    searchQuery,
    {
      // "featured" khi tim kiem = xep theo do khop: khong gui sort de backend giu thu hang
      sort: sortBy === 'featured' ? undefined : mappedSort,
      page: currentPage,
      limit: COLLECTION_PAGE_SIZE,
      category_id:
        compareIds.length > 0 && compareCategoryId != null
          ? compareCategoryId
          : categoryId
    }
  )
  // The products query is disabled (not "loading") while collectionParam is
  // null - the window right after switching category, before its slug
  // resolves to a category_id. Without folding that in, isLoading alone
  // stays false during a category switch and the previous category's grid
  // is shown stale with no loading indicator until the new data arrives.
  const isCollectionLoading = isLoading || isCategoryLoading || !collectionParam

  const navigate = useNavigate()

  const handleToggleCompare = (product: Product) => {
    setCompareProducts(prev => {
      if (prev.some(item => item.id === product.id)) {
        return prev.filter(item => item.id !== product.id)
      }

      if (prev.length >= MAX_COMPARE_PRODUCTS) {
        toast.error(`You can compare up to ${MAX_COMPARE_PRODUCTS} products.`)
        return prev
      }

      if (prev.length > 0 && prev[0].category_id !== product.category_id) {
        toast.error('Only products from the same category can be compared.')
        return prev
      }

      return [...prev, product]
    })
  }

  const handleClearCompare = () => {
    setCompareProducts([])
  }

  const handleCompareNow = () => {
    if (compareIds.length < MIN_COMPARE_PRODUCTS) {
      toast.error(
        `Select at least ${MIN_COMPARE_PRODUCTS} products to compare.`
      )
      return
    }
    const params = new URLSearchParams({
      ids: compareIds.slice(0, MAX_COMPARE_PRODUCTS).join(','),
    })
    navigate(`/compare?${params.toString()}`)
  }

  // Update URL when page changes
  const setCurrentPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    setSearchParams(params)
  }

  const prevCompareCountRef = useRef(compareIds.length)
  useEffect(() => {
    const hadSelection = prevCompareCountRef.current > 0
    const hasSelection = compareIds.length > 0
    if (hadSelection !== hasSelection) {
      const page = parseInt(searchParams.get('page') || '1', 10)
      if (page !== 1) {
        const params = new URLSearchParams(searchParams)
        params.set('page', '1')
        setSearchParams(params)
      }
    }
    prevCompareCountRef.current = compareIds.length
  }, [compareIds.length, searchParams, setSearchParams])

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

  // Hieu ung khi ket qua moi hien ra. Huong: doi category -> theo vi tri chip
  // (phai thi truot tu phai vao); chuyen trang -> trang sau tu phai; doi filter
  // hay sort -> hien dan len. Lan dau vao trang: khong hieu ung luoi.
  const gridKey = products?.products?.length
    ? // Chi theo danh sach id: luc doi trang/category, luoi cu (placeholder) van
      // hien voi trang moi; neu dua trang vao key thi hieu ung bi tinh luc do
      products.products.map(p => p.id).join(',')
    : ''
  const categoryIndex = Math.max(
    0,
    categories.findIndex(
      c => (c.id === 0 ? 'all' : ('slug' in c && c.slug) || String(c.id)) === (collection || 'all')
    )
  )
  const gridMotionRef = useRef<{ key: string; cat: number; page: number; cls: string } | null>(null)
  if (gridKey && gridMotionRef.current?.key !== gridKey) {
    const prev = gridMotionRef.current
    let cls = ''
    if (prev && prev.key) {
      if (prev.cat !== categoryIndex) cls = categoryIndex > prev.cat ? 'page-in-right' : 'page-in-left'
      else if (prev.page !== currentPage) cls = currentPage > prev.page ? 'page-in-right' : 'page-in-left'
      else cls = 'page-in-up'
    }
    gridMotionRef.current = { key: gridKey, cat: categoryIndex, page: currentPage, cls }
  }
  const gridMotion = gridMotionRef.current?.cls ?? ''

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


  return (
    <div className="min-h-screen bg-white">
      {categories.length > 0 && <CategoryNav categories={categories} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {(isLoadingFilters || Object.keys(filters.options).length > 0) && (
          <>
            {/* Mobile: bo loc thu gon sau nut, khong chiem cho cua luoi san pham */}
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              aria-expanded={showFilters}
              className="lg:hidden self-start rounded-lg border px-4 py-2 text-sm font-medium"
            >
              {showFilters ? 'Hide filters' : `Filters${selectedTags.length ? ` (${selectedTags.length})` : ''}`}
            </button>
            <div
              aria-busy={isFiltersStale}
              className={`${showFilters ? 'block' : 'hidden lg:block'} transition-opacity duration-200 ${
                isFiltersStale ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <SidebarFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearAll}
                isLoading={isLoadingFilters}
              />
            </div>
          </>
        )}

        <div
          className={`flex-1 min-w-0 ${
            !(isLoadingFilters || Object.keys(filters.options).length > 0)
              ? 'max-w-none'
              : ''
          }`}
        >
          <div className="mb-6 flex flex-col gap-3">
            {/* Hang cong cu: so ket qua ben trai, Sort by ben phai */}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-gray-600">
                {products && products.products.length > 0 &&
                  (products.pagination
                    ? `Showing ${
                        (products.pagination.current_page - 1) * products.pagination.per_page + 1
                      }–${Math.min(
                        products.pagination.current_page * products.pagination.per_page,
                        products.pagination.total_count
                      )} of ${products.pagination.total_count} products`
                    : `${products.products.length} products`)}
              </p>
              <SortDropdown
                options={sortOptions}
                selected={sortBy}
                onSelect={setSortBy}
              />
            </div>
            {compareIds.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-semibold">
                      {compareIds.length}/{MAX_COMPARE_PRODUCTS}
                    </span>{' '}
                    products selected (min {MIN_COMPARE_PRODUCTS}).
                    <p className="mt-1 text-xs text-blue-800">
                      {compareCategoryName
                        ? `Showing ${compareCategoryName} only — same category, max ${MAX_COMPARE_PRODUCTS} items.`
                        : `Same category only · up to ${MAX_COMPARE_PRODUCTS} products.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearCompare}
                      className="rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleCompareNow}
                      disabled={compareIds.length < MIN_COMPARE_PRODUCTS}
                      className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                      Compare now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(searchQuery ? isSearching : isCollectionLoading) && (
            <div className="space-y-4">
              <SectionSkeleton />
              <ProductGridSkeleton count={9} />
            </div>
          )}

          {!(searchQuery ? isSearching : isCollectionLoading) && products && (
            // Dang tai ket qua moi: lam mo luoi cu thay vi doi sang skeleton
            <div
              aria-busy={searchQuery ? isSearchStale : isCollectionStale}
              className={`transition-opacity duration-200 ${
                (searchQuery ? isSearchStale : isCollectionStale) ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {products.products.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-base font-medium text-gray-800">
                    {searchQuery
                      ? `No products found for "${searchQuery}"`
                      : 'No products found'}
                  </p>
                  <p className="mt-1 text-sm">
                    {searchQuery
                      ? 'Check the spelling, try a shorter or more general keyword, or remove some filters.'
                      : 'Try removing some filters.'}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSearchParams(new URLSearchParams())}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Clear search &amp; filters
                    </button>
                    <Link
                      to="/collection/all?sort=popular"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Browse popular products
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div key={gridKey} className={gridMotion}>
                    <ProductGrid
                      products={products.products}
                      selectedCompareProducts={compareProducts}
                      onCompareToggle={handleToggleCompare}
                      className={gridMotion ? 'stagger-in' : ''}
                    />
                  </div>

                  {products.pagination &&
                    shouldShowPagination(products.pagination) && (
                      <div className="mt-8 border-t border-gray-200 pt-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Collection
