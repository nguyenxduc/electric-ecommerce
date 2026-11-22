import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Package, Tag, Info, X, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications'
import type { Notification, NotificationTab } from '../../services/notificationService'
import { apiErrorMessage } from '../../../lib/apiError'

// ─── Type icon config ─────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  ORDER:  { icon: <Package  size={14} />, color: 'text-blue-500 bg-blue-50'   },
  PROMO:  { icon: <Tag      size={14} />, color: 'text-pink-500 bg-pink-50'   },
  SYSTEM: { icon: <Info     size={14} />, color: 'text-gray-500 bg-gray-100'  },
}

const getTypeConfig = (type?: string | null) =>
  TYPE_CONFIG[type ?? ''] ?? TYPE_CONFIG['SYSTEM']

const TABS: { key: NotificationTab | 'ALL'; label: string; empty: string }[] = [
  { key: 'ALL',    label: 'All',        empty: 'No notifications yet' },
  { key: 'ORDER',  label: 'Orders',     empty: 'No order updates yet' },
  { key: 'PROMO',  label: 'Promotions', empty: 'No promotions right now' },
  { key: 'SYSTEM', label: 'System',     empty: 'No system notices' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotifItem({ notif, onOpen }: { notif: Notification; onOpen: (n: Notification) => void }) {
  const { icon, color } = getTypeConfig(notif.type)
  return (
    <button
      type="button"
      onClick={() => onOpen(notif)}
      data-testid="notification-item"
      className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
        !notif.is_read ? 'bg-blue-50/40' : ''
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
          {notif.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-2 mt-1">
        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-red-500" aria-label="Unread" />}
        {notif.link && <ChevronRight size={14} className="text-gray-300" />}
      </div>
    </button>
  )
}

// ─── Main bell component ──────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<NotificationTab | 'ALL'>('ALL')
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: unread } = useUnreadCount()
  const unreadCount = unread?.total ?? 0
  const { data, isLoading } = useNotifications({
    limit: 20,
    type: tab === 'ALL' ? undefined : tab
  })
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notifications = data?.notifications ?? []

  const handleOpen = (n: Notification) => {
    if (!n.is_read) markRead.mutate([n.id])
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
  }

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onError: err => toast.error(apiErrorMessage(err, 'Could not mark notifications as read'))
    })
  }

  const emptyText = TABS.find(t => t.key === tab)!.empty

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="icon-btn"
        aria-expanded={open}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-[22px] w-[22px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-paper">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel: tren mobile ghim theo man hinh de khong tran ngang */}
      {open && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-gray-600" />
              <span className="font-semibold text-gray-800 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={markAll.isPending}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                >
                  Mark all as read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b" role="tablist">
            {TABS.map(t => {
              const count = t.key === 'ALL' ? unreadCount : unread?.[t.key] ?? 0
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1 ${
                    tab === t.key
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* List */}
          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-0">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell size={32} className="mb-2 opacity-30" />
                <p className="text-sm">{emptyText}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <NotifItem key={String(n.id)} notif={n} onOpen={handleOpen} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 text-center">
              <span className="text-xs text-gray-400">
                Showing {notifications.length} of {data?.pagination.total ?? 0}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
