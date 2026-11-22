import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Dai cuon ngang co nut < > (tu sm), vet mo o mep con noi dung, va chua
// khoang trong cho hieu ung hover cua the (.lift nhac len 2px + bong) -
// overflow-x-auto cat ca truc doc nen the sat mep tung bi cat.
export default function HorizontalScroller({
  children,
  label
}: {
  children: ReactNode
  label: string
}) {
  const ref = useRef<HTMLUListElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update, children])

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const arrow =
    'absolute top-[38%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_-6px_rgb(23_24_27/0.35)] ring-1 ring-gray-200 hover:ring-ink sm:flex'

  return (
    <div className="relative">
      <ul
        ref={ref}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] sm:-mx-3 sm:scroll-px-3 sm:px-3 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      {/* Vet mo bao con noi dung o mep */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 -left-4 w-10 bg-gradient-to-r from-paper to-transparent transition-opacity sm:-left-3 ${
          canLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 -right-4 w-10 bg-gradient-to-l from-paper to-transparent transition-opacity sm:-right-3 ${
          canRight ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {canLeft && (
        <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll left" className={`${arrow} -left-4`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll right" className={`${arrow} -right-4`}>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
