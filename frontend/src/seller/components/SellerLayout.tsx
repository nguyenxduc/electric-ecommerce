import React from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Home,
  ShoppingCart,
  PlusCircle,
  List,
  Store,
  Settings2,
  ExternalLink,
  LogOut,
  ArrowLeft,
  TicketPercent,
  PackageX,
  MessageCircle,
  Receipt
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logout } from '../../client/services/authService'
import { getMyShop } from '../../client/services/shopService'

type NavItem = {
  to: string
  label: string
  icon?: React.ComponentType<{ size?: number }>
  end?: boolean
}
type NavSection = { title?: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    title: 'Main menu',
    items: [
      { to: '/seller', label: 'Dashboard', icon: Home, end: true },
      { to: '/seller/orders', label: 'My Orders', icon: ShoppingCart },
      { to: '/seller/returns', label: 'Returns', icon: PackageX, end: true },
      {
        to: '/seller/coupons',
        label: 'Shop Vouchers',
        icon: TicketPercent,
        end: true
      },
      { to: '/seller/chat', label: 'Buyer Chat', icon: MessageCircle, end: true },
      { to: '/seller/tax', label: 'Tax & Invoices', icon: Receipt, end: true },
      { to: '/seller/shop', label: 'Shop Profile', icon: Settings2, end: true }
    ]
  },
  {
    title: 'Product',
    items: [
      { to: '/seller/products/new', label: 'Add Product', icon: PlusCircle },
      { to: '/seller/products', label: 'My Products', icon: List, end: true }
    ]
  }
]

const STATUS_BANNER: Record<string, { text: string; className: string }> = {
  pending: {
    text: 'Your shop application is pending review. Products will not be visible to buyers until it is approved.',
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  },
  rejected: {
    text: 'Your shop application was rejected. Update your shop profile to resubmit.',
    className: 'bg-red-50 border-red-200 text-red-800'
  },
  suspended: {
    text: 'Your shop is suspended. Its products are hidden from buyers. Contact support for details.',
    className: 'bg-orange-50 border-orange-200 text-orange-800'
  }
}

export default function SellerLayout() {
  const navigate = useNavigate()
  const { data: shop } = useQuery({
    queryKey: ['my-shop'],
    queryFn: getMyShop,
    retry: false
  })

  const banner = shop && shop.status !== 'active' ? STATUS_BANNER[shop.status] : null

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-[256px_1fr] grid-rows-[56px_1fr]">
      {/* Header */}
      <header className="col-start-2 bg-white border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">
            Seller Dashboard
            {shop && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                — {shop.name}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </Link>
          <div className="flex items-center gap-3 pl-3 border-l">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <aside className="row-span-2 border-r bg-white">
        <div className="h-14 flex items-center px-4 font-semibold border-b">
          <Store className="w-5 h-5 mr-2" />
          {shop?.name || 'My Shop'}
        </div>
        <nav className="px-2 py-3 space-y-6">
          {sections.map(section => (
            <div key={section.title ?? 'root'}>
              {section.title && (
                <div className="px-3 text-xs uppercase tracking-wide text-gray-500 mb-2">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded px-3 py-2 text-sm transition relative ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`
                    }
                  >
                    {item.icon ? <item.icon size={16} /> : null}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {shop?.status === 'active' && (
            <div className="mt-6 px-2 border-t pt-4">
              <Link
                to={`/shop/${shop.slug}`}
                className="w-full inline-flex items-center gap-2 border-2 border-blue-600 text-blue-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-50 transition"
              >
                <Store size={16} />
                <span>View My Shop</span>
                <ExternalLink size={14} className="ml-auto" />
              </Link>
            </div>
          )}
        </nav>
      </aside>

      <main className="col-start-2 p-6 bg-gray-50">
        {banner && (
          <div
            className={`mb-4 border rounded-lg px-4 py-3 text-sm ${banner.className}`}
          >
            {banner.text}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
