import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackBehavior } from '../../services/behaviorService'
import { makeProductSlug } from '../../utils/productSlug'
import { useSimilarProducts } from '../../hooks/useProducts'
import { getProductColors } from '../../utils/productColors'

const StarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4 text-blue-600"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
)

interface ProductSimilarProps {
  productId: number
}

const ProductSimilar = ({ productId }: ProductSimilarProps) => {
  const { data: product, isLoading, error } = useSimilarProducts(productId, 8)

  const navigate = useNavigate()
  const listProducts = product?.products || []

  const [currentIndex, setCurrentIndex] = useState(0)
  const next = () => {
    if (currentIndex < listProducts.length - 4)
      setCurrentIndex(currentIndex + 1)
  }

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  // Truoc day ham nay chi console.log nen bam vao san pham tuong tu khong
  // dieu huong di dau. Dung cung dinh dang voi ProductCard: uu tien slug,
  // lui ve id, va gui su kien click cho mo hinh goi y.
  function onClickProduct(id: number, name: string) {
    trackBehavior('click', id, { source: 'similar_products' })
    navigate(`/product/${makeProductSlug(name, id)}`)
  }

  return (
    <div className="w-full mx-auto p-5">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
        Similar Products
      </h2>

      <div className="relative flex items-center">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className={`absolute left-0 z-10 p-2 rounded-full bg-gray-100 shadow-md hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          ‹
        </button>

        <div className="overflow-hidden w-full">
          <div
            className="flex transition-transform duration-300 gap-5"
            style={{ transform: `translateX(-${currentIndex * 260}px)` }}
          >
            {listProducts.map(p => {
              // p.color la truong legacy, co the la mang, mot object, chuoi JSON
              // hoac null. Goi thang .length/.slice() se lam vo ca danh sach khi
              // san pham khong co mau. Dung chung helper voi ProductDetail/Compare,
              // dong thoi uu tien available_colors nen san pham kieu moi cung hien mau.
              const colors = getProductColors(p.available_colors, p.color)
              return (
              <div
                key={p.id}
                className="min-w-[250px] bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition p-3"
                onClick={() => onClickProduct(p.id, p.name)}
              >
                <div className="relative mb-3">
                  <div className="w-full h-40 bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      src={p.img?.[0]}
                      alt={p.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Product colors */}
                  {colors.length > 0 && (
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {colors.slice(0, 3).map((color, i) => (
                        <span
                          key={i}
                          className="h-3 w-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color.code }}
                        />
                      ))}
                      {colors.length > 3 && (
                        <span className="text-xs bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-gray-600 font-medium">
                          +{colors.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-1 line-clamp-2 h-10">
                  {p.name}
                </p>
                {p.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">
                    {p.description.length > 60
                      ? `${p.description.substring(0, 60)}...`
                      : p.description}
                  </p>
                )}
                <p className="text-gray-900 font-semibold mb-1">
                  $
                  {p.final_price
                    ? p.final_price.toFixed(2)
                    : p.price.toFixed(2)}
                </p>

                <div className="flex items-center justify-end text-sm font-medium text-gray-600">
                  <StarIcon />
                  <span className="ml-1">{p.rating.toFixed(1)}</span>
                </div>
              </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={next}
          disabled={currentIndex >= listProducts.length - 4}
          className={`absolute right-0 z-10 p-2 rounded-full bg-gray-100 shadow-md hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          ›
        </button>
      </div>
    </div>
  )
}
export default ProductSimilar
