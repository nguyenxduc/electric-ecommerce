import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  Home,
  ShoppingCart,
  Users,
  TicketPercent,
  Layers,
  PlusCircle,
  List,
  Settings2,
  ExternalLink,
  Store,
  Filter,
  LogOut,
  ArrowLeft,
  MessageCircle,
  ScrollText,
  Bell,
  Bot,
  Activity,
  Banknote,
  ShieldAlert,
  Receipt
} from 'lucide-react'
import { useValidateToken } from '../../client/hooks/useAuth'
import { useAllChats } from '../../client/hooks/useChat'
import { useLogout } from '../../client/hooks/useAuth'
import { toast } from 'sonner'

type NavItem = {
  to: string
  label: string
  icon?: React.ComponentType<{ size?: number }>
  end?: boolean
}
type NavSection = { title?: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    items: [{ to: '/admin', label: 'Dashboard', icon: Home, end: true }]
  },
  {
    title: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/admin/shops', label: 'Shops', icon: Store, end: true },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent }
    ]
  },
  {
    title: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: List },
      { to: '/admin/products/new', label: 'Add Product', icon: PlusCircle },
      { to: '/admin/categories', label: 'Categories', icon: Layers },
      { to: '/admin/filters', label: 'Filter Options', icon: Filter },
      { to: '/admin/filter-keys', label: 'Filter Keys', icon: Filter }
    ]
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/cod', label: 'COD Reconciliation', icon: Banknote, end: true },
      { to: '/admin/fraud', label: 'Fraud Flags', icon: ShieldAlert, end: true },
      { to: '/admin/tax', label: 'Tax & Invoices', icon: Receipt, end: true }
    ]
  },
  {
    title: 'Support',
    items: [
      { to: '/admin/chat', label: 'Customer Chat', icon: MessageCircle, end: true },
      { to: '/admin/notifications', label: 'Notifications', icon: Bell, end: true },
      { to: '/admin/ai-feedback', label: 'AI Feedback', icon: Bot, end: true }
    ]
  },
  {
    title: 'System',
    items: [
      { to: '/admin/audit-logs', label: 'Audit Log', icon: ScrollText, end: true },
      { to: '/admin/health', label: 'System Health', icon: Activity, end: true },
      { to: '/admin/settings', label: 'Settings', icon: Settings2, end: true }
    ]
  }
]

const NAV_ITEMS = sections.flatMap(s => s.items)
// Tieu de header = muc menu khop dai nhat voi URL (vd. /admin/products/12 -> Products)
const pageTitle = (pathname: string) =>
  NAV_ITEMS.filter(i => pathname === i.to || pathname.startsWith(i.to + '/')).sort(
    (a, b) => b.to.length - a.to.length
  )[0]?.label ?? 'Admin'

export default function AdminLayout() {
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
  const { data: userData } = useValidateToken()
  const { data: chatsData } = useAllChats(1, 50)

  const totalUnreadCount =
    chatsData?.data?.chats?.reduce(
      (sum, chat) => sum + (chat.unreadCount || 0),
      0
    ) || 0

  // Hook dung chung: dang xuat + xoa cache cua nguoi dung truoc
  const logoutMutation = useLogout()
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
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
          <div className="truncate text-base md:text-lg font-semibold text-gray-800">
            <span className="hidden sm:inline text-gray-400 font-normal">Admin / </span>
            {pageTitle(pathname)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-2 md:px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Shop</span>
          </Link>
          {userData?.user && (
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
          )}
        </div>
      </header>

      {navOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}
      <aside
        id="side-nav"
        className={`${navOpen ? 'fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto shadow-xl' : 'hidden'} md:sticky md:top-0 md:block md:h-screen md:self-start md:overflow-y-auto md:row-span-2 md:row-start-1 border-r bg-white`}
      >
        <div className="h-14 flex items-center px-4 font-semibold border-b">
          <Store className="w-5 h-5 mr-2" />
          TechShop Admin
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
                          ? 'bg-green-100 text-green-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`
                    }
                  >
                    {item.icon ? <item.icon size={16} /> : null}
                    <span>{item.label}</span>
                    {item.to === '/admin/chat' && totalUnreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-6 px-2 border-t pt-4">
            <Link
              to="/"
              className="w-full inline-flex items-center gap-2 border-2 border-blue-600 text-blue-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-50 transition"
            >
              <Store size={16} />
              <span>View Shop</span>
              <ExternalLink size={14} className="ml-auto" />
            </Link>
          </div>
        </nav>
      </aside>

      <main className="md:col-start-2 min-w-0 p-3 md:p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
