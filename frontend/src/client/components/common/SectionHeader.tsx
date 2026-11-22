import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Tieu de section dung chung: dong nho phia tren (eyebrow), tieu de, link "xem tat ca" ben phai
export default function SectionHeader({
  eyebrow,
  title,
  to,
  linkLabel = 'View all',
  aside
}: {
  eyebrow?: string
  title: ReactNode
  to?: string
  linkLabel?: string
  aside?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-[28px] font-bold leading-tight text-ink">{title}</h2>
      </div>
      {aside}
      {to && (
        <Link
          to={to}
          className="group shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-brand-700"
        >
          {linkLabel}
          <ArrowRight
            className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  )
}
