import React from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Home,
  ShoppingCart,
  Users,
  TicketPercent,
  Layers,
  Wallet,
  Badge,
  PlusCircle,
  Images,
  List,
  MessageSquare,
  Shield,
  Settings2,
  ExternalLink,
  Store,
  Filter,
  LogOut,
  ArrowLeft,
  MessageCircle,
  ScrollText,
  Bell,
  Bot
} from 'lucide-react'
import { useValidateToken } from '../../client/hooks/useAuth'
import { useAllChats } from '../../client/hooks/useChat'
import { logout } from '../../client/services/authService'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

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
      { to: '/admin', label: 'Dashboard', icon: Home, end: true },
      { to: '/admin/orders', label: 'Order Management', icon: ShoppingCart },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/coupons', label: 'Coupon Code', icon: TicketPercent },
      { to: '/admin/categories', label: 'Categories', icon: Layers },
      {
        to: '/admin/filters',
        label: 'Filter Options',
        icon: Filter,
        end: true
      },
      {
        to: '/admin/filter-keys',
        label: 'Filter Keys',
        icon: Filter,
        end: true
      },
      {
        to: '/admin/chat',
        label: 'Customer Chat',
        icon: MessageCircle,
        end: true
      },
      {
        to: '/admin/notifications',
        label: 'Notifications',
        icon: Bell,
        end: true
      },
      {
        to: '/admin/audit-logs',
        label: 'Audit Log',
        icon: ScrollText,
        end: true
      },
      {
        to: '/admin/ai-feedback',
        label: 'AI Feedback',
        icon: Bot,
        end: true
      },
      { to: '/admin/settings', label: 'Settings', icon: Settings2, end: true }
    ]
  },
  {
    title: 'Product',
    items: [
      { to: '/admin/products/new', label: 'Add Products', icon: PlusCircle },

      { to: '/admin/products', label: 'Product List', icon: List, end: true }
      // {
      //   to: '/admin/product-reviews',
      //   label: 'Product Reviews',
      //   icon: MessageSquare
      // }
    ]
  }
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { data: userData } = useValidateToken()
  const { data: chatsData } = useAllChats(1, 50)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!userData?.user || userData.user.role !== 'admin') return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const apiUrl =
      (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000'
    const socketUrl = apiUrl.replace('/api', '')
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Admin socket connected for notifications')
    })

    newSocket.on('chat_notification', data => {})

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [userData])

  const totalUnreadCount =
    chatsData?.data?.chats?.reduce(
      (sum, chat) => sum + (chat.unreadCount || 0),
      0
    ) || 0

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
          <h1 className="text-lg font-semibold text-gray-800">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Shop</span>
          </Link>
          {userData?.user && (
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
          )}
        </div>
      </header>

      <aside className="row-span-2 border-r bg-white">
        <div className="h-14 flex items-center px-4 font-semibold border-b">
          <Store className="w-5 h-5 mr-2" />
          TechShop Admin
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

      <main className="col-start-2 p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
