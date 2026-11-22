import { PLACEHOLDER_IMAGE } from '../../utils/placeholderImage'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  Clock,
  Loader2,
  Search as SearchGlyph,
  Sparkles,
  Store,
  TrendingUp,
  X
} from 'lucide-react'
import { useSearchSuggest } from '../../hooks/useProducts'
import {
  fetchImageSearchOverview,
  searchProductsByImage
} from '../../services/productService'
import type { ImageSearchData } from '../../types/product'
import { makeProductSlug } from '../../utils/productSlug'


type ModalProps = {
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

const money = (n?: number) =>
  `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// To dam phan khop voi tu khoa (khong phan biet hoa thuong)
const highlight = (text: string, term: string): ReactNode => {
  const q = term.trim()
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

const SectionTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="mb-2 flex items-center justify-between">
    <h3 className="eyebrow">{children}</h3>
    {action}
  </div>
)

function Modal({
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
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageData, setImageData] = useState<ImageSearchData | null>(null)
  const overviewRequestIdRef = useRef(0)

  // Khoa cuon trang phia sau + Esc de dong (ke ca khi focus khong o input)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

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

  const renderChips = (section: SuggestItem['section'], icon?: ReactNode) =>
    items
      .filter(i => i.section === section)
      .map(item => (
        <button
          key={item.id}
          id={item.id}
          role="option"
          type="button"
          onClick={item.go}
          className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-inset ring-gray-200 hover:ring-ink"
        >
          {icon}
          <span className="truncate">{item.label}</span>
        </button>
      ))

  const renderRows = (section: 'product' | 'shop') =>
    items.map(
      item =>
        item.section === section && (
          <button
            key={item.id}
            id={item.id}
            role="option"
            type="button"
            onClick={item.go}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-paper"
          >
            {section === 'product' ? (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper">
                <img
                  src={item.img || PLACEHOLDER_IMAGE}
                  alt=""
                  className="h-full w-full object-contain p-1 mix-blend-multiply"
                />
              </span>
            ) : item.img ? (
              <img src={item.img} alt="" className="h-9 w-9 shrink-0 rounded-full bg-paper object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper">
                <Store className="h-4 w-4 text-gray-500" />
              </span>
            )}
            <span className="min-w-0 flex-1 text-sm text-gray-700 line-clamp-2">
              {highlight(item.label, searchTerm)}
            </span>
            {section === 'product' ? (
              <span className="price shrink-0 text-sm font-semibold text-ink">{money(item.price)}</span>
            ) : (
              <span className="shrink-0 text-xs text-gray-500">Shop</span>
            )}
          </button>
        )
    )

  // Enter luon tim theo chu dang go (khong chon goi y bang phim mui ten)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
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

  const clearImage = () => {
    setSelectedFile(null)
    setImageError('')
    setImageData(null)
    setOverviewLoading(false)
    overviewRequestIdRef.current += 1
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  const term = searchTerm.trim()
  const hasCategories = items.some(i => i.section === 'category')
  const hasProducts = items.some(i => i.section === 'product')
  const hasShops = items.some(i => i.section === 'shop')

  // Portal ra body: header co backdrop-blur, ma backdrop-filter bien header thanh
  // khung chua cho moi phan tu position:fixed ben trong -> modal tung bi nhot
  // trong dai header cao 64px, ket qua goi y bi cat mat.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/25 sm:px-4 sm:pt-[10vh]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="flex w-full max-w-2xl flex-col bg-white max-sm:h-full sm:max-h-[min(80vh,720px)] sm:rounded-2xl sm:shadow-[0_32px_80px_-32px_rgb(23_24_27/0.45)] sm:ring-1 sm:ring-gray-200/80"
        onClick={e => e.stopPropagation()}
      >
        {/* O nhap */}
        <div className="flex-shrink-0 border-b border-gray-100 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-paper px-4 ring-1 ring-inset ring-transparent focus-within:bg-white focus-within:ring-ink">
              <SearchGlyph className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                placeholder="Search products, categories or shops"
                className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                value={searchTerm}
                role="combobox"
                aria-expanded
                aria-controls="search-suggestions"
                aria-autocomplete="list"
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    inputRef.current?.focus()
                  }}
                  aria-label="Clear search"
                  className="-mr-1 rounded-full p-1 text-gray-400 hover:bg-gray-200/60 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <span className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />
              <button
                onClick={handleChooseImage}
                type="button"
                aria-label="Search by image"
                title="Search by image"
                className="-mr-2 shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-200/60 hover:text-ink"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => onSubmit()}
              className="btn-primary max-sm:hidden"
              disabled={!term}
            >
              Search
            </button>
            <button
              onClick={onClose}
              type="button"
              className="shrink-0 rounded-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-paper hover:text-ink sm:hidden"
            >
              Cancel
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
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-paper p-2.5">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Selected"
                  className="h-12 w-12 rounded-lg bg-white object-cover ring-1 ring-gray-200"
                />
              )}
              {selectedFile && (
                <p className="min-w-0 max-w-[220px] flex-1 truncate text-xs text-gray-600">
                  {selectedFile.name}
                </p>
              )}
              {imageError && (
                <p className="text-xs font-medium text-red-600">{imageError}</p>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSearchByImage}
                  disabled={!selectedFile || imageLoading}
                  className="btn-primary px-4 py-2"
                >
                  {imageLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Search by image
                </button>
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Remove image"
                  className="rounded-full p-2 text-gray-400 hover:bg-white hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ket qua */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {imageData && (
            <div className="space-y-5">
              <div className="space-y-2 rounded-xl bg-paper p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Sparkles className="h-4 w-4" /> AI image analysis
                </p>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  <div>
                    <dt className="inline">Type: </dt>
                    <dd className="inline font-medium text-ink">
                      {imageData.detected.product_type || 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Brand: </dt>
                    <dd className="inline font-medium text-ink">
                      {imageData.detected.brand || 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Model: </dt>
                    <dd className="inline font-medium text-ink">
                      {imageData.detected.line_or_model || 'Not clearly detected'}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-600">{imageData.notice}</p>
                {overviewLoading && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-gray-500">
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
                          className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-700 ring-1 ring-inset ring-gray-200 hover:ring-ink"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <section aria-labelledby="image-related-products-heading">
                <SectionTitle
                  action={
                    formattedImageResults.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {formattedImageResults.length} item
                        {formattedImageResults.length === 1 ? '' : 's'}
                      </span>
                    )
                  }
                >
                  <span id="image-related-products-heading">Related products</span>
                </SectionTitle>
                <p className="mb-3 text-xs text-gray-500">
                  Gợi ý dựa trên ảnh bạn tải lên — không phải khớp chính xác 100%.
                </p>
                {formattedImageResults.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {formattedImageResults.map(item => (
                      <button
                        key={`img-${item.id}`}
                        type="button"
                        onClick={() => onSelectProduct(item.id, item.name)}
                        className="flex items-center gap-3 rounded-xl bg-white p-2.5 text-left ring-1 ring-inset ring-gray-200 hover:ring-ink"
                      >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper">
                          <img
                            src={item.thumb || PLACEHOLDER_IMAGE}
                            alt=""
                            className="h-full w-full object-contain p-1 mix-blend-multiply"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-ink line-clamp-2">
                            {item.name}
                          </span>
                          <span className="price mt-0.5 block text-sm font-semibold text-ink">
                            {money(item.price)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-paper px-4 py-6 text-center text-sm text-gray-500">
                    No related products found in the shop.
                  </p>
                )}
              </section>
            </div>
          )}

          {!imageData && (
            <div id="search-suggestions" role="listbox" aria-label="Search suggestions" className="space-y-5">
              {!term && recent.length > 0 && (
                <section>
                  <SectionTitle
                    action={
                      <button
                        type="button"
                        onClick={clearRecent}
                        className="text-xs font-medium text-gray-500 hover:text-ink"
                      >
                        Clear
                      </button>
                    }
                  >
                    Recent searches
                  </SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {renderChips('recent', <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" />)}
                  </div>
                </section>
              )}
              {!term && (data?.trending?.length ?? 0) > 0 && (
                <section>
                  <SectionTitle>Trending</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {renderChips('trending', <TrendingUp className="h-3.5 w-3.5 shrink-0 opacity-60" />)}
                  </div>
                </section>
              )}
              {!term && recent.length === 0 && !(data?.trending?.length) && (
                <p className="py-6 text-center text-sm text-gray-500">
                  Start typing to search products, categories and shops.
                </p>
              )}

              {term && (
                <>
                  {isFetching && items.length === 0 && (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-2 py-2">
                          <div className="h-12 w-12 animate-pulse rounded-lg bg-paper" />
                          <div className="h-3.5 flex-1 animate-pulse rounded bg-paper" />
                        </div>
                      ))}
                    </div>
                  )}
                  {isError && (
                    <p className="text-sm text-red-600">
                      Unable to search products. Please try again.
                    </p>
                  )}
                  {!isFetching && !isError && items.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No matches for “{term}”. Try another keyword or search by image.
                    </p>
                  )}
                  {hasCategories && (
                    <section>
                      <SectionTitle>Categories</SectionTitle>
                      <div className="flex flex-wrap gap-2">{renderChips('category')}</div>
                    </section>
                  )}
                  {hasProducts && (
                    <section>
                      <SectionTitle>Products</SectionTitle>
                      <div className="-mx-2 space-y-0.5">{renderRows('product')}</div>
                    </section>
                  )}
                  {hasShops && (
                    <section>
                      <SectionTitle>Shops</SectionTitle>
                      <div className="-mx-2 space-y-0.5">{renderRows('shop')}</div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Chan: xem tat ca ket qua */}
        {term && !imageData && (
          <button
            type="button"
            onClick={() => onSubmit()}
            className="group flex flex-shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-left text-sm hover:bg-paper sm:rounded-b-2xl"
          >
            <span className="min-w-0 truncate text-gray-700">
              See all results for <span className="font-semibold text-ink">“{term}”</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>,
    document.body
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
        className="icon-btn"
        aria-label="Open search"
        aria-haspopup="dialog"
      >
        <SearchGlyph aria-hidden="true" />
      </button>
    </div>
  )
}

export default Search
