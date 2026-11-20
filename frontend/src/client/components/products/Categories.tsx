import { Link } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories'

const Categories = () => {
  const { data: categoriesList = [] } = useCategories()

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mt-10">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Shop by category</h2>
      <ul className="grid grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        {categoriesList.map(category => (
          <li key={category.id}>
            <Link
              to={`/collection/${category.slug}`}
              className="group flex flex-col items-center h-full bg-white rounded-xl border border-gray-100 px-2 py-3 sm:py-4 hover:border-blue-200 hover:shadow-sm transition"
            >
              <img
                src={category.image_url}
                alt=""
                className="w-12 h-12 sm:w-20 sm:h-20 object-contain group-hover:scale-110 transition-transform duration-300"
              />
              <span className="mt-2 text-xs sm:text-sm text-gray-700 text-center line-clamp-1">
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
