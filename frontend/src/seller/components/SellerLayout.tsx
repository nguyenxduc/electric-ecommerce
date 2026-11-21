import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
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
  Receipt,
  Wallet
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
      { to: '/seller/finance', label: 'My Income', icon: Wallet, end: true },
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
  const { pathname } = useLocation()
  // Mobile: sidebar la drawer, dong lai sau moi lan chuyen trang
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => setNavOpen(false), [pathname])
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!navOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false)
    // Len md drawer thanh sidebar tinh: bo trang thai mo de thu nho lai khong bat len
    const mq = window.matchMedia('(min-width: 768px)')
    const onMq = () => mq.matches && setNavOpen(false)
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [navOpen])
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
    } catch {
      toast.error('Failed to logout')
    }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[256px_1fr] md:grid-rows-[56px_1fr]">
      {/* Header */}
      <header className="md:col-start-2 h-14 bg-white border-b flex items-center justify-between gap-2 px-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="side-nav"
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="truncate text-base md:text-lg font-semibold text-gray-800">
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
            className="flex items-center gap-2 px-2 md:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Marketplace</span>
          </Link>
          <div className="flex items-center gap-3 pl-2 md:pl-3 border-l">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-2 md:px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {navOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}
      <aside
        id="side-nav"
        className={`${navOpen ? 'fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto shadow-xl' : 'hidden'} md:static md:block md:row-span-2 md:row-start-1 border-r bg-white`}
      >
        <div className="h-14 flex items-center px-4 font-semibold border-b">
          <Store className="w-5 h-5 mr-2" />
          {shop?.name || 'My Shop'}
          <button
            type="button"
            ref={closeRef}
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="md:hidden ml-auto p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-2 py-3 space-y-6" onClick={e => (e.target as HTMLElement).closest('a') && setNavOpen(false)}>
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

      <main className="md:col-start-2 min-w-0 p-3 md:p-6 bg-gray-50">
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
