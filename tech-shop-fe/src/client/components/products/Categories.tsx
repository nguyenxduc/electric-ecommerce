import { useCategories } from '../../hooks/useCategories'
import { useNavigate } from 'react-router-dom'

const Categories = () => {
  const { data: categoriesList = [] } = useCategories()

  const navigate = useNavigate()

  function goTo(slug: string) {
    navigate(`/collection/${slug}`)
  }

  return (
    <div className="none lg:flex flex-row gap-[30px] items-center justify-center p-10">
      {categoriesList.map(category => (
        <div
          onClick={() => goTo(category.slug)}
          key={category.id}
          className="flex flex-col items-center shadow rounded-lg px-4 py-4 cursor-pointer"
        >
          <img
            src={category.image_url}
            alt={category.name}
            className="w-32 h-32 object-contain mb-2 hover:scale-125 transition-transform duration-300"
          />
          <span className="text-sm font-normal">{category.name}</span>
        </div>
      ))}
    </div>
  )
}

export default Categories
