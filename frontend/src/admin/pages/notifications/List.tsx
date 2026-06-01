import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bell, Plus, Search, RefreshCw, Package, Tag, Info,
  CheckCircle2, Clock, X, Send
} from 'lucide-react'
import { toast } from 'sonner'
import { useAdminNotifications, useCreateNotification } from '../../hooks/useNotifications'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import type { Notification } from '../../services/notificationService'

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_OPTS = ['SYSTEM', 'ORDER', 'PROMO']

const TYPE_STYLE: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ORDER:  { bg: 'bg-blue-100',  text: 'text-blue-700',  icon: <Package size={12} /> },
  PROMO:  { bg: 'bg-pink-100',  text: 'text-pink-700',  icon: <Tag     size={12} /> },
  SYSTEM: { bg: 'bg-gray-100',  text: 'text-gray-600',  icon: <Info    size={12} /> },
}
const getTypeStyle = (t?: string | null) => TYPE_STYLE[t ?? ''] ?? TYPE_STYLE['SYSTEM']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Create form modal ────────────────────────────────────────────────────────
function CreateModal({ onClose }: { onClose: () => void }) {
  const create = useCreateNotification()
  const [form, setForm] = useState({
    title:   '',
    message: '',
    type:    'SYSTEM',
    user_id: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required')
      return
    }
    try {
      await create.mutateAsync({
        title:   form.title.trim(),
        message: form.message.trim(),
        type:    form.type,
        user_id: form.user_id ? form.user_id.trim() : null
      })
      toast.success('Notification sent!')
      onClose()
    } catch {
      toast.error('Failed to create notification')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Create Notification</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. New promotion available"
              maxLength={120}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Message *</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Notification content..."
            />
          </div>

          {/* Type + User ID row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {TYPE_OPTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">
                User ID <span className="text-gray-400 font-normal">(blank = broadcast)</span>
              </label>
              <input
                value={form.user_id}
                onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. 42 (all users if empty)"
              />
            </div>
          </div>

          {/* Target preview */}
          <div className={`rounded-lg px-3 py-2.5 text-xs flex items-center gap-2 ${
            form.user_id ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
          }`}>
            <Send size={12} />
            {form.user_id
              ? `Send to User #${form.user_id} only`
              : 'Broadcast to ALL users'}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {create.isPending ? 'Sending...' : 'Send Notification'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminNotificationsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(20)
  const [showCreate, setShowCreate] = useState(false)

  const page        = parseInt(searchParams.get('page') || '1', 10)
  const unreadOnly  = searchParams.get('unread') === '1'

  const { data, isLoading, refetch, isFetching } = useAdminNotifications({
    page,
    limit,
    unreadOnly
  })

  const notifications: Notification[] = data?.data?.data?.notifications ?? []
  const pagination = data?.data?.data?.pagination
  const pages = useMemo(() => Math.max(1, pagination?.pages ?? 1), [pagination])

  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams)
    p.set('page', String(n))
    setSearchParams(p)
  }

  const toggleUnread = () => {
    const p = new URLSearchParams()
    if (!unreadOnly) p.set('unread', '1')
    p.set('page', '1')
    setSearchParams(p)
  }

  return (
    <div className="space-y-4">
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h1 className="text-xl font-semibold">Notifications</h1>
          {pagination && (
            <span className="text-sm text-gray-400">
              ({pagination.total.toLocaleString()} total)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 border rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Create Notification
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded border">
        <div className="flex border-b">
          <button
            onClick={() => { if (unreadOnly) toggleUnread() }}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              !unreadOnly
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { if (!unreadOnly) toggleUnread() }}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              unreadOnly
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Unread only
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No notifications found.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-gray-600 font-medium">Title / Message</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Type</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Target</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Status</th>
                  <th className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">Time</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n: Notification) => {
                  const ts = getTypeStyle(n.type)
                  return (
                    <tr
                      key={String(n.id)}
                      className={`border-t hover:bg-gray-50 transition-colors ${
                        !n.is_read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="p-3 max-w-xs">
                        <p className={`font-medium text-gray-800 leading-snug ${!n.is_read ? 'font-semibold' : ''}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ts.bg} ${ts.text}`}>
                          {ts.icon}
                          {n.type ?? 'SYSTEM'}
                        </span>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        {n.user_id ? (
                          <span className="text-blue-600 font-mono">User #{String(n.user_id)}</span>
                        ) : (
                          <span className="text-green-600 font-medium">📢 All users</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {n.is_read ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={13} />
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                            <Clock size={13} />
                            Unread
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                        {timeAgo(n.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <AdminPagination
              page={pagination?.page ?? page}
              totalPages={pages}
              onPageChange={setPage}
              totalItems={pagination?.total}
            />
          </>
        )}
      </div>
    </div>
  )
}
