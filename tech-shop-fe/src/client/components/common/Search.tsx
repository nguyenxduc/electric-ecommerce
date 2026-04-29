import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2 } from 'lucide-react'
import { useSearchProducts } from '../../hooks/useProducts'
import {
  fetchImageSearchOverview,
  searchProductsByImage
} from '../../services/productService'
import type { ImageSearchData } from '../../types/product'
import { makeProductSlug } from '../../utils/productSlug'

// @ts-ignore
import SearchIcon from '../../../assets/search-icon.svg'

type ModalProps = {
  open: boolean
  searchTerm: string
  onClose: () => void
  onChange: (value: string) => void
  onSubmit: () => void
  onSelectProduct: (productId: number, productName: string) => void
}

const useDebouncedValue = (value: string, delay = 350) => {
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
  onSelectProduct
}: ModalProps) {
  const debouncedTerm = useDebouncedValue(searchTerm)
  const { data, isFetching, isError } = useSearchProducts(debouncedTerm, {
    limit: 6,
    sort: 'popular'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [imageData, setImageData] = useState<ImageSearchData | null>(null)
  const overviewRequestIdRef = useRef(0)

  const results = data?.products || []

  const formattedResults = useMemo(
    () =>
      results.map(product => ({
        id: Number(product.id),
        name: product.name,
        price: product.final_price ?? product.price,
        thumb: product.img?.[0],
        slug: makeProductSlug(product.name, product.id)
      })),
    [results]
  )

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
      className={`fixed inset-0 flex justify-center items-start pt-20 transition-colors ${
        open ? 'visible bg-black/30 backdrop-blur-sm' : 'invisible'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-[90%] max-w-3xl transition-all ${
          open
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-105 opacity-0 -translate-y-4'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <img src={SearchIcon} alt="Search" className="h-5 w-5" />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Search products, categories or keywords..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSubmit()
                }
              }}
            />
            <button
              onClick={onSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              disabled={!searchTerm.trim()}
            >
              Search
            </button>
            <button
              onClick={handleChooseImage}
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 inline-flex items-center gap-1.5"
            >
              <Camera className="h-4 w-4" />
              Image
            </button>
            <button
              onClick={onClose}
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              Close
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

        <div className="p-6">
          {imageData && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
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
              {formattedImageResults.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {formattedImageResults.map(item => (
                    <button
                      key={`img-${item.id}`}
                      type="button"
                      onClick={() => onSelectProduct(item.id, item.name)}
                      className="flex items-center gap-4 p-3 border border-emerald-100 rounded-xl hover:border-emerald-300 hover:shadow-sm transition text-left bg-white"
                    >
                      <img
                        src={
                          item.thumb ||
                          'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'
                        }
                        alt={item.name}
                        className="h-16 w-16 object-contain rounded-lg bg-gray-50"
                      />
                      <div className="flex-1">
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
                <p className="text-xs text-gray-600">
                  No related products found in shop.
                </p>
              )}
            </div>
          )}

          {!searchTerm.trim() && (
            <p className="text-sm text-gray-500">
              Enter keywords to start searching for products.
            </p>
          )}

          {searchTerm.trim() && (
            <div className="space-y-3">
              {isFetching && (
                <div className="space-y-2">
                  {[...Array(4)].map((_, idx) => (
                    <div
                      key={idx}
                      className="h-16 bg-gray-100 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              )}

              {isError && (
                <p className="text-sm text-red-500">
                  Unable to search products. Please try again.
                </p>
              )}

              {!imageData &&
                !isFetching &&
                !isError &&
                formattedResults.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No matching products found.
                  </p>
                )}

              {formattedResults.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {formattedResults.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectProduct(item.id, item.name)}
                      className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition text-left"
                    >
                      <img
                        src={
                          item.thumb ||
                          'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'
                        }
                        alt={item.name}
                        className="h-16 w-16 object-contain rounded-lg bg-gray-50"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">
                          {item.name}
                        </p>
                        <p className="text-sm text-blue-600 font-semibold mt-1">
                          ${Number(item.price).toLocaleString('en-US')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
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

  const handleSubmit = () => {
    if (!searchTerm.trim()) return
    setIsOpen(false)
    navigate(`/collection/all?search=${encodeURIComponent(searchTerm.trim())}`)
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
