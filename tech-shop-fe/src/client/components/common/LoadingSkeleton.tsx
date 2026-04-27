import React from 'react'

type SkeletonProps = {
  className?: string
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
)

export const ProductCardSkeleton = () => (
  <div className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3 shadow-sm">
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </div>
    <Skeleton className="h-8 w-full" />
  </div>
)

export const ProductGridSkeleton = ({ count = 12 }: { count?: number }) => (
  <div className="grid grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, idx) => (
      <ProductCardSkeleton key={idx} />
    ))}
  </div>
)

export const SectionSkeleton = () => (
  <div className="mb-6 flex items-center justify-between">
    <Skeleton className="h-7 w-40" />
    <Skeleton className="h-5 w-20" />
  </div>
)

export const SidebarSkeleton = () => (
  <div className="w-64 flex-shrink-0">
    <div className="mb-6 flex items-center justify-between">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-4 w-12" />
    </div>
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2 pl-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const TableSkeleton = ({
  rows = 6,
  cols = 4
}: {
  rows?: number
  cols?: number
}) => (
  <div className="overflow-hidden rounded-lg border border-gray-200">
    <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3">
      {Array.from({ length: cols }).map((_, idx) => (
        <Skeleton key={idx} className="h-4 w-full" />
      ))}
    </div>
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid grid-cols-12 gap-2 p-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`${r}-${c}`} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const ProductDetailSkeleton = () => (
  <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 py-6 md:grid-cols-2">
    <Skeleton className="h-80 w-full" />
    <div className="space-y-4">
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-10 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  </div>
)
