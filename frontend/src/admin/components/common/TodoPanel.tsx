import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

export type TodoItem = { label: string; count?: number; to: string; hint?: string }

// Khoi "To-do" dau dashboard (kieu Seller Center): moi o la so viec + link toi
// danh sach da loc san. So > 0 to dam de mat nhin thay ngay viec can lam.
export default function TodoPanel({
  title = 'To-do',
  items,
  loading,
  action
}: {
  title?: string
  items: TodoItem[]
  loading?: boolean
  action?: ReactNode
}) {
  const total = items.reduce((n, i) => n + (i.count ?? 0), 0)
  return (
    <section className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          {title}
          {!loading && total === 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-green-600">
              <CheckCircle2 className="w-4 h-4" /> All caught up
            </span>
          )}
        </h2>
        {action}
      </div>
      <ul className={`grid grid-cols-2 sm:grid-cols-3 ${items.length > 6 ? 'lg:grid-cols-4' : items.length > 3 ? 'lg:grid-cols-6' : 'lg:grid-cols-3'} gap-3`}>
        {items.map(item => {
          const n = item.count ?? 0
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className="block h-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 hover:border-blue-200 hover:bg-blue-50/40 transition"
              >
                {loading ? (
                  <span className="block h-7 w-10 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <span className={`block text-2xl font-semibold ${n > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    {n}
                  </span>
                )}
                <span className="block text-sm text-gray-600 mt-1">{item.label}</span>
                {item.hint && <span className="block text-xs text-gray-400">{item.hint}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
