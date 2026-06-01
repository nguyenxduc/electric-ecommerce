import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, Package, Tag, Info, X } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkRead } from '../../hooks/useNotifications'
import type { Notification } from '../../services/notificationService'

// ─── Type icon config ─────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  ORDER:  { icon: <Package  size={14} />, color: 'text-blue-500 bg-blue-50'   },
  PROMO:  { icon: <Tag      size={14} />, color: 'text-pink-500 bg-pink-50'   },
  SYSTEM: { icon: <Info     size={14} />, color: 'text-gray-500 bg-gray-100'  },
}

const getTypeConfig = (type?: string | null) =>
  TYPE_CONFIG[type ?? ''] ?? TYPE_CONFIG['SYSTEM']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotifItem({
  notif,
  onMarkRead
}: {
  notif: Notification
  onMarkRead: (id: string | number) => void
}) {
  const { icon, color } = getTypeConfig(notif.type)
  return (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-default ${
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
      {!notif.is_read && (
        <button
          onClick={() => onMarkRead(notif.id)}
          title="Mark as read"
          className="flex-shrink-0 mt-1 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-green-600 transition-colors"
        >
          <CheckCheck size={14} />
        </button>
      )}
    </div>
  )
}

// ─── Main bell component ──────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: unreadCount = 0 } = useUnreadCount()
  const { data, isLoading } = useNotifications({
    limit: 20,
    unreadOnly: showUnreadOnly
  })
  const markRead = useMarkRead()

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

  const handleMarkOne = (id: string | number) => {
    markRead.mutate([id])
  }

  const handleMarkAll = () => {
    const unread = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unread.length > 0) markRead.mutate(unread)
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
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
                  disabled={markRead.isPending}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setShowUnreadOnly(false)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                !showUnreadOnly
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setShowUnreadOnly(true)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                showUnreadOnly
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
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
                <p className="text-sm">
                  {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <NotifItem key={String(n.id)} notif={n} onMarkRead={handleMarkOne} />
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
