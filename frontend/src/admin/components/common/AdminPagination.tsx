type AdminPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  className?: string
}

export default function AdminPagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  className = ''
}: AdminPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages)

  const windowSize = 7
  const start =
    safeTotalPages <= windowSize
      ? 1
      : safePage <= 4
        ? 1
        : safePage >= safeTotalPages - 3
          ? safeTotalPages - (windowSize - 1)
          : safePage - 3

  const pageNumbers = Array.from(
    { length: Math.min(windowSize, safeTotalPages) },
    (_, i) => start + i
  ).filter(n => n >= 1 && n <= safeTotalPages)

  return (
    <div
      className={`flex items-center justify-between p-3 border-t text-sm ${className}`}
    >
      <span className="text-gray-400 text-xs">
        Page {safePage} of {safeTotalPages}
        {typeof totalItems === 'number'
          ? ` — ${totalItems.toLocaleString()} items`
          : ''}
      </span>

      <div className="flex items-center gap-1">
        <button
          className="px-3 py-1.5 border rounded disabled:opacity-40"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </button>

        {pageNumbers.map(n => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`px-3 py-1.5 rounded border ${
              n === safePage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            {n}
          </button>
        ))}

        <button
          className="px-3 py-1.5 border rounded disabled:opacity-40"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
