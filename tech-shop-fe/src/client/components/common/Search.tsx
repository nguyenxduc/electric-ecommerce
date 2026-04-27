import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchProducts } from '../../hooks/useProducts'
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

  const results = data?.products || []

  const formattedResults = useMemo(
    () =>
      results.map(product => ({
        id: product.id,
        name: product.name,
        price: product.final_price ?? product.price,
        thumb: product.img?.[0],
        slug: makeProductSlug(product.name, product.id)
      })),
    [results]
  )

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
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6">
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

              {!isFetching && !isError && formattedResults.length === 0 && (
                <p className="text-sm text-gray-500">
                  No matching products found.
                </p>
              )}

              {formattedResults.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {formattedResults.map(item => (
                    <button
                      key={item.id}
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
                          ${item.price?.toLocaleString('en-US')}
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
