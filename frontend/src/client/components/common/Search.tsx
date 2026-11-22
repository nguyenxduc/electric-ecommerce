import { PLACEHOLDER_IMAGE } from '../../utils/placeholderImage'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2 } from 'lucide-react'
import { useSearchSuggest } from '../../hooks/useProducts'
import {
  fetchImageSearchOverview,
  searchProductsByImage
} from '../../services/productService'
import type { ImageSearchData } from '../../types/product'
import { makeProductSlug } from '../../utils/productSlug'

import SearchIcon from '../../../assets/search-icon.svg'

type ModalProps = {
  open: boolean
  searchTerm: string
  onClose: () => void
  onChange: (value: string) => void
  onSubmit: (term?: string) => void
  onNavigate: (path: string) => void
  onSelectProduct: (productId: number, productName: string) => void
}

type SuggestItem = {
  id: string
  section: 'recent' | 'trending' | 'category' | 'product' | 'shop'
  label: string
  img?: string | null
  price?: number
  go: () => void
}

const RECENT_KEY = 'ngx_recent_searches'
const RECENT_MAX = 8

const readRecent = (): string[] => {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(list) ? list.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

const saveRecent = (term: string) => {
  try {
    const next = [term, ...readRecent().filter(x => x !== term)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* localStorage bi chan: bo qua */
  }
}

const useDebouncedValue = (value: string, delay = 250) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

function Modal({
  open,
  searchTerm,
  onClose,
  onChange,
  onSubmit,
  onNavigate,
  onSelectProduct
}: ModalProps) {
  const debouncedTerm = useDebouncedValue(searchTerm)
  const { data, isFetching, isError } = useSearchSuggest(
    searchTerm.trim() ? debouncedTerm : ''
  )
  const [recent, setRecent] = useState<string[]>(readRecent)
  const [active, setActive] = useState(-1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageData, setImageData] = useState<ImageSearchData | null>(null)
  const overviewRequestIdRef = useRef(0)

  const items = useMemo<SuggestItem[]>(() => {
    if (!searchTerm.trim()) {
      return [
        ...recent.map(t => ({
          id: `sg-recent-${t}`,
          section: 'recent' as const,
          label: t,
          go: () => onSubmit(t)
        })),
        ...(data?.trending || []).map(t => ({
          id: `sg-trending-${t}`,
          section: 'trending' as const,
          label: t,
          go: () => onSubmit(t)
        }))
      ]
    }
    return [
      ...(data?.categories || []).map(c => ({
        id: `sg-cat-${c.id}`,
        section: 'category' as const,
        label: c.name,
        go: () => onNavigate(`/collection/${c.slug}`)
      })),
      ...(data?.products || []).map(p => ({
        id: `sg-prod-${p.id}`,
        section: 'product' as const,
        label: p.name,
        img: p.img,
        price: p.final_price,
        go: () => onSelectProduct(p.id, p.name)
      })),
      ...(data?.shops || []).map(sh => ({
        id: `sg-shop-${sh.slug}`,
        section: 'shop' as const,
        label: sh.name,
        img: sh.logo_url,
        go: () => onNavigate(`/shop/${sh.slug}`)
      }))
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, recent, searchTerm])

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_KEY)
    } catch {
      /* bo qua */
    }
    setRecent([])
  }

  const renderChips = (section: SuggestItem['section']) =>
    items
      .filter(i => i.section === section)
      .map(item => (
        <button
          key={item.id}
          id={item.id}
          role="option"
          aria-selected={items[active]?.id === item.id}
          type="button"
          onClick={item.go}
          className={`max-w-full truncate px-3 py-1 rounded-full text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 ${
            items[active]?.id === item.id ? 'bg-blue-50 border-blue-300' : 'bg-white'
          }`}
        >
          {item.label}
        </button>
      ))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (items.length === 0) return
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      const next =
        active < 0 ? (step > 0 ? 0 : items.length - 1) : (active + step + items.length) % items.length
      setActive(next)
      document.getElementById(items[next].id)?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[active]) items[active].go()
      else onSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const formattedImageResults = useMemo(
    () =>
      (imageData?.products || []).map(product => ({
        id: Number(product.id),
        name: product.name,
        price: product.final_price ?? product.price,
        thumb: product.img?.[0],
        slug: makeProductSlug(product.name, product.id)
      })),
    [imageData]
  )

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('')
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const handleChooseImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setImageError('')
    setImageData(null)
    setOverviewLoading(false)
    overviewRequestIdRef.current += 1
  }

  const handleSearchByImage = async () => {
    if (!selectedFile) {
      setImageError('Please choose an image first.')
      return
    }
    setImageLoading(true)
    setImageError('')
    setOverviewLoading(false)
    overviewRequestIdRef.current += 1
    const requestId = overviewRequestIdRef.current
    try {
      const response = await searchProductsByImage(selectedFile)
      const immediateData = response?.data || null
      setImageData(immediateData)
      if (immediateData?.generated_query) {
        onChange(immediateData.generated_query)
      }

      if (
        immediateData?.overview_pending &&
        (immediateData?.detected?.product_type ||
          immediateData?.detected?.brand ||
          immediateData?.detected?.line_or_model)
      ) {
        setOverviewLoading(true)
        try {
          const overviewRes = await fetchImageSearchOverview({
            detected: immediateData.detected,
            product_name: immediateData.products?.[0]?.name || '',
            fallback_notice: immediateData.notice
          })
          if (
            overviewRequestIdRef.current === requestId &&
            overviewRes?.data?.overview
          ) {
            setImageData(prev =>
              prev
                ? {
                    ...prev,
                    notice: overviewRes.data.overview,
                    overview_pending: false
                  }
                : prev
            )
          }
        } catch {
          if (overviewRequestIdRef.current === requestId) {
            setImageData(prev =>
              prev ? { ...prev, overview_pending: false } : prev
            )
          }
        } finally {
          if (overviewRequestIdRef.current === requestId) {
            setOverviewLoading(false)
          }
        }
      }
    } catch (error: unknown) {
      setImageData(null)
      const err = error as { response?: { data?: { message?: string } } }
      setImageError(
        err?.response?.data?.message ||
          'Unable to analyze this image. Please try another one.'
      )
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center items-start sm:p-4 sm:pt-16 sm:pb-8 overflow-y-auto transition-colors ${
        open ? 'visible bg-black/30 backdrop-blur-sm' : 'invisible pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-sm:h-full max-sm:rounded-none sm:max-h-[min(90vh,calc(100vh-2rem))] sm:my-auto transition-all ${
          open
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-105 opacity-0 -translate-y-4'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-3 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-xl bg-blue-50 max-sm:hidden">
              <img src={SearchIcon} alt="Search" className="h-5 w-5" />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Search products or categories"
              className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              role="combobox"
              aria-expanded
              aria-controls="search-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={items[active]?.id}
              onChange={e => {
                setActive(-1)
                onChange(e.target.value)
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => onSubmit()}
              className="max-sm:hidden px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              disabled={!searchTerm.trim()}
            >
              Search
            </button>
            <button
              onClick={handleChooseImage}
              type="button"
              aria-label="Search by image"
              className="shrink-0 px-3 py-2.5 sm:py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 inline-flex items-center gap-1.5"
            >
              <Camera className="h-4 w-4" />
              <span className="max-sm:hidden">Image</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="shrink-0 px-2 sm:px-3 py-2 rounded-lg sm:border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              <span className="sm:hidden">Cancel</span>
              <span className="max-sm:hidden">Close</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          {(selectedFile || imageError) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Selected"
                  className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                />
              )}
              {selectedFile && (
                <p className="text-xs text-gray-600 max-w-[220px] truncate">
                  {selectedFile.name}
                </p>
              )}
              <button
                type="button"
                onClick={handleSearchByImage}
                disabled={!selectedFile || imageLoading}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-60 inline-flex items-center gap-2"
              >
                {imageLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Search by image
              </button>
              {imageError && (
                <p className="text-xs font-medium text-red-600">{imageError}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {imageData && (
            <div className="mb-6 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-800">
                  AI image analysis
                </p>
                <p className="text-xs text-gray-700">
                  Type:{' '}
                  <span className="font-medium">
                    {imageData.detected.product_type || 'Unknown'}
                  </span>{' '}
                  | Brand:{' '}
                  <span className="font-medium">
                    {imageData.detected.brand || 'Unknown'}
                  </span>{' '}
                  | Model:{' '}
                  <span className="font-medium">
                    {imageData.detected.line_or_model || 'Not clearly detected'}
                  </span>
                </p>
                <p className="text-xs text-gray-700">{imageData.notice}</p>
                {overviewLoading && (
                  <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating product overview...
                  </p>
                )}
                {Array.isArray(imageData.suggested_queries) &&
                  imageData.suggested_queries.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {imageData.suggested_queries.map(query => (
                        <button
                          key={query}
                          type="button"
                          onClick={() => onChange(query)}
                          className="px-2.5 py-1 rounded-full text-xs border border-emerald-200 text-emerald-800 bg-white hover:bg-emerald-50"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <section aria-labelledby="image-related-products-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h3
                    id="image-related-products-heading"
                    className="text-sm font-semibold text-gray-900"
                  >
                    Related products
                  </h3>
                  <span className="text-xs text-gray-500">
                    Sản phẩm liên quan trong cửa hàng
                    {formattedImageResults.length > 0
                      ? ` · ${formattedImageResults.length} item${
                          formattedImageResults.length === 1 ? '' : 's'
                        }`
                      : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Gợi ý dựa trên ảnh bạn tải lên — không phải khớp chính xác
                  100%.
                </p>
                {formattedImageResults.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {formattedImageResults.map(item => (
                      <button
                        key={`img-${item.id}`}
                        type="button"
                        onClick={() => onSelectProduct(item.id, item.name)}
                        className="flex items-center gap-4 p-3 border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition text-left bg-white"
                      >
                        <img
                          src={
                            item.thumb ||
                            PLACEHOLDER_IMAGE
                          }
                          alt={item.name}
                          className="h-16 w-16 object-contain rounded-lg bg-gray-50 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 line-clamp-2">
                            {item.name}
                          </p>
                          <p className="text-sm text-emerald-700 font-semibold mt-1">
                            ${Number(item.price).toLocaleString('en-US')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                    No related products found in the shop.
                  </p>
                )}
              </section>
            </div>
          )}

          {!imageData && (
            <div id="search-suggestions" role="listbox" aria-label="Search suggestions" className="space-y-4">
              {!searchTerm.trim() && recent.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Recent searches</h3>
                    <button
                      type="button"
                      onClick={clearRecent}
                      className="text-xs text-gray-500 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {renderChips('recent')}
                  </div>
                </section>
              )}
              {!searchTerm.trim() && (data?.trending?.length ?? 0) > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Trending</h3>
                  <div className="flex flex-wrap gap-2">{renderChips('trending')}</div>
                </section>
              )}

              {searchTerm.trim() && (
                <>
                  {isFetching && items.length === 0 && (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, idx) => (
                        <div key={idx} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  )}
                  {isError && (
                    <p className="text-sm text-red-500">
                      Unable to search products. Please try again.
                    </p>
                  )}
                  {!isFetching && !isError && items.length === 0 && (
                    <p className="text-sm text-gray-500">No matching products found.</p>
                  )}
                  {items.some(i => i.section === 'category') && (
                    <div className="flex flex-wrap gap-2">{renderChips('category')}</div>
                  )}
                  {items.some(i => i.section === 'product') && (
                    <div className="space-y-1">
                      {items.map(
                        item =>
                          item.section === 'product' && (
                            <button
                              key={item.id}
                              id={item.id}
                              role="option"
                              aria-selected={items[active]?.id === item.id}
                              type="button"
                              onClick={item.go}
                              className={`w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-gray-50 ${
                                items[active]?.id === item.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              <img
                                src={item.img || PLACEHOLDER_IMAGE}
                                alt=""
                                className="h-12 w-12 object-contain rounded-lg bg-gray-50 flex-shrink-0"
                              />
                              <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 line-clamp-2">
                                {item.label}
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-blue-600">
                                ${Number(item.price).toLocaleString('en-US')}
                              </span>
                            </button>
                          )
                      )}
                    </div>
                  )}
                  {items.some(i => i.section === 'shop') && (
                    <div className="space-y-1">
                      {items.map(
                        item =>
                          item.section === 'shop' && (
                            <button
                              key={item.id}
                              id={item.id}
                              role="option"
                              aria-selected={items[active]?.id === item.id}
                              type="button"
                              onClick={item.go}
                              className={`w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-gray-50 ${
                                items[active]?.id === item.id ? 'bg-blue-50' : ''
                              }`}
                            >
                              <img
                                src={item.img || PLACEHOLDER_IMAGE}
                                alt=""
                                className="h-8 w-8 object-cover rounded-full bg-gray-100 flex-shrink-0"
                              />
                              <span className="flex-1 min-w-0 truncate text-sm text-gray-800">
                                {item.label}
                              </span>
                              <span className="shrink-0 text-xs text-gray-500">Shop</span>
                            </button>
                          )
                      )}
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

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (term?: string) => {
    const value = (term ?? searchTerm).trim()
    if (!value) return
    saveRecent(value)
    setIsOpen(false)
    navigate(`/collection/all?search=${encodeURIComponent(value)}`)
  }

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    navigate(path)
  }

  const handleSelectProduct = (productId: number, productName: string) => {
    const slug = makeProductSlug(productName, productId)
    setIsOpen(false)
    navigate(`/product/${slug}`)
  }

  return (
    <div>
      {isOpen && (
        <Modal
          open={isOpen}
          searchTerm={searchTerm}
          onClose={() => setIsOpen(false)}
          onChange={value => setSearchTerm(value)}
          onSubmit={handleSubmit}
          onNavigate={handleNavigate}
          onSelectProduct={handleSelectProduct}
        />
      )}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setSearchTerm('')
        }}
        className="hover:opacity-80 transition"
        aria-label="Open search"
      >
        <img src={SearchIcon} alt="Search" className="h-6 w-6" />
      </button>
    </div>
  )
}

export default Search
