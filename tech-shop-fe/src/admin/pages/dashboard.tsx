import React from 'react'
import { Link } from 'react-router-dom'
import { useDashboardStats, useTopProducts } from '../hooks'

export default function AdminDashboard() {
  const { data: statsData, isLoading: statsLoading } = useDashboardStats()
  const { data: topProductsData, isLoading: topProductsLoading } = useTopProducts(4)

  const stats = statsData?.data
  const topProducts = topProductsData?.data || []

  if (statsLoading) {
    return (
      <div className="grid gap-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="text-center py-8 text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Total Sales"
          subtitle="Last 7 days"
          value={stats?.sales.formatted || '$0'}
          delta={stats?.sales.delta || '0%'}
          prev={`Previous 7days (${stats?.sales.formattedPrev || '$0'})`}
        />
        <KpiCard
          title="Total Orders"
          subtitle="Last 7 days"
          value={stats?.orders.formatted || '0'}
          delta={stats?.orders.delta || '0%'}
          prev={`Previous 7days (${stats?.orders.formattedPrev || '0'})`}
        />
        <KpiSplitCard
          title="Pending & Canceled"
          subtitle="Last 7 days"
          left={{
            label: 'Pending',
            value: stats?.pending.formatted || '0',
            delta: stats?.pending.delta || '0%'
          }}
          right={{
            label: 'Canceled',
            value: stats?.cancelled.formatted || '0',
            delta: stats?.cancelled.delta || '0%'
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded border">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="font-semibold">Report for this week</div>
            <div className="flex items-center gap-2 text-sm">
              <button className="px-2 py-1 rounded border bg-green-50 text-green-700">
                This week
              </button>
              <button className="px-2 py-1 rounded border">Last week</button>
              <button className="p-2 rounded border">⋮</button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 p-4 text-center text-sm">
            <div>
              <div className="text-2xl font-semibold">{stats?.customers.formatted || '0'}</div>
              <div className="text-gray-500">Customers</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats?.products.formatted.total || '0'}</div>
              <div className="text-gray-500">Total Products</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats?.products.formatted.inStock || '0'}</div>
              <div className="text-gray-500">Stock Products</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats?.products.formatted.outOfStock || '0'}</div>
              <div className="text-gray-500">Out of Stock</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats?.revenue.formatted || '$0'}</div>
              <div className="text-gray-500">Revenue</div>
            </div>
          </div>
          <ChartPlaceholder />
        </div>
        <div className="bg-white rounded border">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="font-semibold">Top Products</div>
            <Link to="/admin/products" className="text-sm text-blue-600">
              All product
            </Link>
          </div>
          <div className="p-4">
            {topProductsLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">No products yet</div>
            ) : (
              <div className="space-y-3 text-sm">
                {topProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200" />
                      )}
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-gray-500">{p.sku}</div>
                      </div>
                    </div>
                    <div className="font-semibold">{p.price}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  subtitle,
  value,
  delta,
  prev
}: {
  title: string
  subtitle: string
  value: string
  delta: string
  prev: string
}) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xs text-gray-400">{subtitle}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <span
          className={`text-xs ${
            delta.startsWith('-') ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {delta}
        </span>
      </div>
      <div className="mt-1 text-xs text-blue-600">{prev}</div>
      <div className="mt-3 text-right">
        <button className="px-3 py-1.5 text-xs border rounded">Details</button>
      </div>
    </div>
  )
}

function KpiSplitCard({
  title,
  subtitle,
  left,
  right
}: {
  title: string
  subtitle: string
  left: { label: string; value: string; delta: string }
  right: { label: string; value: string; delta: string }
}) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xs text-gray-400">{subtitle}</div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        {[left, right].map((s, idx) => (
          <div key={idx}>
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-semibold">{s.value}</div>
              <span
                className={`text-xs ${
                  s.delta.startsWith('-') ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-right">
        <button className="px-3 py-1.5 text-xs border rounded">Details</button>
      </div>
    </div>
  )
}

function ChartPlaceholder() {
  return (
    <div className="p-4">
      <div className="h-48 rounded bg-gradient-to-b from-green-100 to-white border flex items-end">
        <div className="w-full h-full">
          <svg
            viewBox="0 0 400 150"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 120 C40 80, 80 100, 120 70 C160 40, 200 90, 240 70 C280 50, 320 90, 360 80 L400 150 L0 150 Z"
              fill="#bbf7d0"
            />
            <path
              d="M0 120 C40 80, 80 100, 120 70 C160 40, 200 90, 240 70 C280 50, 320 90, 360 80"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

