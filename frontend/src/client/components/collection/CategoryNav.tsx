import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

interface CategoryNavProps {
  categories: Array<{
    id: number
    name: string
    slug?: string
    image_url: string
  }>
}

// Thanh category dang chip chu. Nen ink cua chip dang chon la mot lop rieng
// truot ngang (transform + width) toi chip moi, cung kieu tab Log in / Sign up.
// Dung <Link> that de mo tab moi duoc.
const CategoryNav = ({ categories }: CategoryNavProps) => {
  const { collection } = useParams<{ collection: string }>()
  const currentSlug = collection === 'all' || !collection ? 'all' : collection

  const listRef = useRef<HTMLUListElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  const [animate, setAnimate] = useState(false)

  useLayoutEffect(() => {
    const list = listRef.current
    // Do vi tri cua <li> (offsetParent la <ul relative>), khong do <a>: <a> nam
    // trong <li relative> nen offsetLeft cua no luon ~0
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]')?.parentElement
    if (!list || !active) {
      setPill(null)
      return
    }
    const place = () => setPill({ left: active.offsetLeft, width: active.offsetWidth })
    place()
    // Mobile: dua chip dang chon vao giua thanh cuon (chi cuon thanh, khong cuon trang)
    const target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
    list.scrollTo({ left: Math.max(0, target), behavior: animate ? 'smooth' : 'auto' })
    // Lan dau dat thang vao cho; tu lan doi category sau moi truot
    const id = requestAnimationFrame(() => setAnimate(true))
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', place)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate chi la co bat transition
  }, [currentSlug, categories])

  if (!categories || categories.length === 0) return null

  return (
    <nav aria-label="Categories" className="border-b border-gray-200/70">
      <div className="section-wrap">
        <ul
          ref={listRef}
          className="relative -mx-1 flex gap-1 overflow-x-auto px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pill && (
            <li
              aria-hidden
              className={`pointer-events-none absolute top-3 h-9 rounded-full bg-ink ${
                animate ? 'transition-[transform,width] duration-300 ease-out' : ''
              }`}
              style={{ width: pill.width, transform: `translateX(${pill.left}px)`, left: 0 }}
            />
          )}
          {categories.map(cat => {
            const slug = cat.id === 0 ? 'all' : cat.slug || cat.id.toString()
            const isActive = currentSlug === slug
            return (
              <li key={cat.id} className="relative shrink-0">
                <Link
                  to={`/collection/${slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-300 ${
                    isActive ? 'font-semibold text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
                  }`}
                >
                  {cat.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export default CategoryNav
