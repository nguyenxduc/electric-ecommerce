import React from 'react'
import { Link } from 'react-router-dom'
import { useDashboardStats, useTopProducts, useBehaviorAnalytics, useAdminTodo } from '../hooks'
import TodoPanel from '../components/common/TodoPanel'

export default function AdminDashboard() {
  const { data: statsData, isLoading: statsLoading } = useDashboardStats()
  const { data: topProductsData, isLoading: topProductsLoading } = useTopProducts(4)
  const { data: behaviorData, isLoading: behaviorLoading } = useBehaviorAnalytics(30)
  const { data: todo, isLoading: todoLoading } = useAdminTodo()

  const stats = statsData?.data
  const topProducts = topProductsData?.data || []
  const behavior = behaviorData?.data

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

      <TodoPanel
        loading={todoLoading}
        items={[
          { label: 'Shop applications', count: todo?.shops_pending, to: '/admin/shops?status=pending' },
          { label: 'Unread support messages', count: todo?.unread_support, to: '/admin/chat' },
          { label: 'Open fraud flags', count: todo?.fraud_open, to: '/admin/fraud' },
          { label: 'Products taken down', count: todo?.products_taken_down, to: '/admin/products?status=taken_down' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Total Sales"
          subtitle="Last 7 days"
          value={stats?.sales.formatted || '$0'}
          delta={stats?.sales.delta || '0%'}
          prev={`Previous 7 days (${stats?.sales.formattedPrev || '$0'})`}
        />
        <KpiCard
          title="Total Orders"
          subtitle="Last 7 days"
          value={stats?.orders.formatted || '0'}
          delta={stats?.orders.delta || '0%'}
          prev={`Previous 7 days (${stats?.orders.formattedPrev || '0'})`}
        />
        <KpiSplitCard
          title="Pending & Cancelled"
          subtitle="Last 7 days"
          left={{
            label: 'Pending',
            value: stats?.pending.formatted || '0',
            delta: stats?.pending.delta || '0%'
          }}
          right={{
            label: 'Cancelled',
            value: stats?.cancelled.formatted || '0',
            delta: stats?.cancelled.delta || '0%'
          }}
        />
      </div>

      <div className="bg-white rounded border">
        <div className="p-4 border-b">
          <div className="font-semibold">Retention &amp; conversion funnel</div>
          <div className="text-xs text-gray-400">Last 30 days (UTC)</div>
        </div>
        {behaviorLoading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-center text-sm">
              <div>
                <div className="text-2xl font-semibold">{behavior?.visitors ?? 0}</div>
                <div className="text-gray-500">Visitors</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{behavior?.returningRate ?? 0}%</div>
                <div className="text-gray-500">Returning visitors</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {behavior?.funnel.viewToCartRate ?? 0}%
                </div>
                <div className="text-gray-500">View → cart</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {behavior?.funnel.cartToOrderRate ?? 0}%
                </div>
                <div className="text-gray-500">
                  Cart → order
                  <div className="text-xs text-gray-400">signed-in users only</div>
                </div>
              </div>
            </div>
            {/* Doc thang tu response de UI khong bao gio lech so voi cach query thuc su chay. */}
            {behavior && (
              <details className="px-4 pb-4 text-xs text-gray-500">
                <summary className="cursor-pointer select-none">How these numbers are calculated</summary>
                <div className="mt-2 space-y-1 text-gray-400">
                  <div>{behavior.caveats.rollupLag}</div>
                  <div>{behavior.caveats.anonymousExcluded}</div>
                  <div>{behavior.caveats.identityNote}</div>
                </div>
              </details>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 bg-white rounded border">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="font-semibold">Store overview</div>
            <div className="text-xs text-gray-400">All time</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-4 text-center text-sm">
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
        </div>
        <div className="bg-white rounded border">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="font-semibold">Top Products</div>
            <Link to="/admin/products" className="text-sm text-blue-600">
              All products
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
        <Link to="/admin/orders" className="inline-block px-3 py-1.5 text-xs border rounded hover:bg-gray-50">
          View orders
        </Link>
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
        <Link to="/admin/orders" className="inline-block px-3 py-1.5 text-xs border rounded hover:bg-gray-50">
          View orders
        </Link>
      </div>
    </div>
  )
}
