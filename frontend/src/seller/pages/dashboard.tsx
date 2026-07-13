import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  ShoppingCart,
  Clock,
  XCircle,
  Package,
  TrendingUp
} from 'lucide-react'
import {
  getShopDashboardStats,
  getShopTopProducts
} from '../../admin/services/dashboardService'

const StatCard = ({
  title,
  value,
  delta,
  icon: Icon,
  iconClass
}: {
  title: string
  value: string
  delta?: string
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
}) => (
  <div className="bg-white rounded-lg border p-4 flex items-start justify-between">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {delta && (
        <p
          className={`text-xs mt-1 ${
            delta.startsWith('+') ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {delta} vs previous 7 days
        </p>
      )}
    </div>
    <div className={`p-2 rounded-lg ${iconClass}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
)

export default function SellerDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['seller', 'dashboard', 'stats'],
    queryFn: getShopDashboardStats,
    staleTime: 30 * 1000
  })
  const { data: topData } = useQuery({
    queryKey: ['seller', 'dashboard', 'top-products'],
    queryFn: () => getShopTopProducts(5),
    staleTime: 60 * 1000
  })

  const stats = statsData?.data

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sales (7 days)"
          value={stats?.sales.formatted || '$0.00'}
          delta={stats?.sales.delta}
          icon={DollarSign}
          iconClass="bg-green-100 text-green-600"
        />
        <StatCard
          title="Orders (7 days)"
          value={stats?.orders.formatted || '0'}
          delta={stats?.orders.delta}
          icon={ShoppingCart}
          iconClass="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Pending Orders"
          value={stats?.pending.formatted || '0'}
          delta={stats?.pending.delta}
          icon={Clock}
          iconClass="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Cancelled Orders"
          value={stats?.cancelled.formatted || '0'}
          delta={stats?.cancelled.delta}
          icon={XCircle}
          iconClass="bg-red-100 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold">Products</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-medium">
                {stats?.products.formatted.total || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">In stock</span>
              <span className="font-medium text-green-600">
                {stats?.products.formatted.inStock || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Out of stock</span>
              <span className="font-medium text-red-600">
                {stats?.products.formatted.outOfStock || '0'}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-500">All-time revenue</span>
              <span className="font-semibold">
                {stats?.revenue.formatted || '$0.00'}
              </span>
            </div>
            {stats?.commission && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Platform fee ({stats.commission.ratePercent})
                  </span>
                  <span className="font-medium text-red-600">
                    -{stats.commission.formatted.fee}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700 font-medium">
                    Net payout
                  </span>
                  <span className="font-bold text-green-700">
                    {stats.commission.formatted.netRevenue}
                  </span>
                </div>
              </>
            )}
          </div>
          <Link
            to="/seller/products"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Manage products →
          </Link>
        </div>

        <div className="bg-white rounded-lg border p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold">Top Selling Products</h2>
          </div>
          {topData?.data?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Product</th>
                  <th className="py-2">Price</th>
                  <th className="py-2 text-right">Sold</th>
                </tr>
              </thead>
              <tbody>
                {topData.data.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {p.image && (
                          <img
                            src={p.image}
                            className="h-8 w-8 rounded object-contain bg-gray-50"
                          />
                        )}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2">{p.price}</td>
                    <td className="py-2 text-right">{p.sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">No sales yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
