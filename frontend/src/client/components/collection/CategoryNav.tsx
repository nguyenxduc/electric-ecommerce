import { useNavigate, useParams } from 'react-router-dom'
import { Grid3X3 } from 'lucide-react'

interface CategoryNavProps {
  categories: Array<{
    id: number
    name: string
    slug?: string
    image_url: string
  }>
}

const CategoryNav = ({ categories }: CategoryNavProps) => {
  const navigate = useNavigate()
  const { collection } = useParams<{ collection: string }>()

  // Determine current active category by slug
  const currentSlug = collection === 'all' || !collection ? 'all' : collection

  function goTo(category: { id: number; slug?: string }) {
    if (category.id === 0) {
      navigate('/collection/all')
    } else {
      navigate(`/collection/${category.slug || category.id}`)
    }
  }

  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <div className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-6 overflow-x-auto lg:justify-between">
          {categories.map(cat => {
            const categorySlug =
              cat.id === 0 ? 'all' : cat.slug || cat.id.toString()
            const isActive = currentSlug === categorySlug
            return (
              <button
                type="button"
                onClick={() => goTo(cat)}
                key={cat.id}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-shrink-0 flex-col items-center gap-2 cursor-pointer transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {cat.id === 0 ? (
                  // Special icon for "All" category
                  <Grid3X3 className="w-6 h-6" />
                ) : cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt=""
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                )}
                <span className={`text-xs whitespace-nowrap ${isActive ? 'font-medium' : ''}`}>
                  {cat.name}
                </span>
                {isActive && (
                  <div className="w-full h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CategoryNav
