import { Link } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories'
import SectionHeader from '../common/SectionHeader'

const Categories = () => {
  const { data: categoriesList = [] } = useCategories()
  if (!categoriesList.length) return null

  return (
    <section className="section-wrap mt-16">
      <SectionHeader eyebrow="Browse" title="Shop by category" to="/collection/all" linkLabel="All products" />
      {/* Mobile cuon ngang; tu sm la luoi nen tat overflow. Vien dung ring-inset:
          ring thuong ve ra ngoai the 1px va bi overflow cua ul cat mat (mep tren,
          the sat le). */}
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
        {categoriesList.map(category => (
          <li key={category.id} className="w-24 shrink-0 sm:w-auto">
            <Link
              to={`/collection/${category.slug}`}
              className="zoom-on-hover group flex h-full flex-col items-center rounded-2xl bg-white px-2 py-4 ring-1 ring-inset ring-gray-200/70 transition-shadow hover:ring-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <img
                src={category.image_url}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                className="h-12 w-12 object-contain mix-blend-multiply sm:h-16 sm:w-16"
              />
              <span className="mt-3 line-clamp-1 text-center text-xs font-medium text-gray-700 sm:text-sm">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Categories
