import { Link, useParams } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'

interface CategoryNavProps {
  categories: Array<{
    id: number
    name: string
    slug?: string
    image_url: string
  }>
}

// Thanh category tren trang danh sach, cung kieu the "Shop by category" o trang
// chu: o icon nen trang vien nhat, category dang chon vien ink + chu dam.
// Dung <Link> that (mo tab moi duoc) thay vi button + navigate.
const CategoryNav = ({ categories }: CategoryNavProps) => {
  const { collection } = useParams<{ collection: string }>()
  const currentSlug = collection === 'all' || !collection ? 'all' : collection

  if (!categories || categories.length === 0) return null

  return (
    <nav aria-label="Categories" className="border-b border-gray-200/70">
      <ul className="section-wrap flex gap-2 overflow-x-auto py-4 [scrollbar-width:none] sm:gap-3 lg:justify-between [&::-webkit-scrollbar]:hidden">
        {categories.map(cat => {
          const slug = cat.id === 0 ? 'all' : cat.slug || cat.id.toString()
          const isActive = currentSlug === slug
          return (
            <li key={cat.id} className="shrink-0">
              <Link
                to={`/collection/${slug}`}
                aria-current={isActive ? 'page' : undefined}
                className="group flex min-w-[76px] flex-col items-center gap-2 rounded-xl px-1 py-1 text-center"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-inset transition-shadow ${
                    isActive ? 'ring-2 ring-ink' : 'ring-gray-200/80 group-hover:ring-ink'
                  }`}
                >
                  {cat.id === 0 ? (
                    <LayoutGrid className="h-5 w-5 text-ink" strokeWidth={1.5} aria-hidden="true" />
                  ) : cat.image_url ? (
                    <img src={cat.image_url} alt="" className="h-7 w-7 object-contain mix-blend-multiply" />
                  ) : (
                    <span className="h-5 w-5 rounded bg-paper" />
                  )}
                </span>
                <span
                  className={`whitespace-nowrap text-xs ${
                    isActive ? 'font-semibold text-ink' : 'text-gray-600 group-hover:text-ink'
                  }`}
                >
                  {cat.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default CategoryNav
