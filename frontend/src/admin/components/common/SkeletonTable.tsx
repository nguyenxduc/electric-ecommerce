import React from 'react'

export default function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse p-4">
      <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
      <div className="border rounded">
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {[...Array(cols)].map((__, c) => (
              <div key={c} className="h-10 border-t bg-gray-100/70" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}


