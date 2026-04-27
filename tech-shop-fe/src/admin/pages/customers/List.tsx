import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit3, Trash2, Search, Star } from 'lucide-react'
import {
  useAdminCustomers,
  useDeleteAdminCustomer,
  useUpdateAdminCustomer
} from '../../hooks'
import Modal from '../../components/common/Modal'
import SkeletonTable from '../../components/common/SkeletonTable'
import type { CustomerListResponse } from '../../types'

const TIER_STYLE: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  BRONZE:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Bronze',   icon: '🥉' },
  SILVER:   { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Silver',   icon: '🥈' },
  GOLD:     { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Gold',     icon: '🥇' },
  PLATINUM: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Platinum', icon: '💎' },
}

const getTierFromPoints = (points: number) => {
  if (points >= 5000) return 'PLATINUM'
  if (points >= 2000) return 'GOLD'
  if (points >= 500)  return 'SILVER'
  return 'BRONZE'
}

export default function AdminCustomersList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(10)

  // Get parameters from URL
  const page = parseInt(searchParams.get('page') || '1', 10)
  const q = searchParams.get('q') || ''

  const { data, isLoading, refetch } = useAdminCustomers({
    page,
    limit,
    q: q || undefined
  })
  const del = useDeleteAdminCustomer()
  const [editId, setEditId] = useState<number | null>(null)
  const update = useUpdateAdminCustomer(editId || 0)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  // Update URL when page changes
  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    setSearchParams(params)
  }

  // Update URL when query changes
  const setQ = (newQuery: string) => {
    const params = new URLSearchParams(searchParams)
    if (newQuery) {
      params.set('q', newQuery)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // Reset to first page when searching
    setSearchParams(params)
  }

  const onDelete = (id: number) => {
    if (confirm('Delete this customer?')) del.mutate(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
            placeholder="Search name/email/phone"
          />
          <button
            className="px-3 py-2 border rounded"
            onClick={() => refetch()}
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded border">
        {isLoading ? (
          <SkeletonTable rows={5} cols={8} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Points</th>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.users.map(u => {
                  const pts = u.loyalty_points ?? 0
                  const tierKey = u.segment || getTierFromPoints(pts)
                  const tier = TIER_STYLE[tierKey] ?? TIER_STYLE['BRONZE']
                  return (
                    <tr key={u.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="p-2">{u.name || '-'}</td>
                      <td className="p-2">{u.email || '-'}</td>
                      <td className="p-2">{u.phone || '-'}</td>
                      <td className="p-2">{u.role || 'user'}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Star size={13} className="text-yellow-500 fill-yellow-400" />
                          <span className="font-medium text-gray-700">{pts.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tier.bg} ${tier.text}`}>
                          {tier.icon} {tier.label}
                        </span>
                      </td>
                      <td className="p-2">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <button
                            title="Edit"
                            className="text-blue-600"
                            onClick={() => setEditId(u.id)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            title="Delete"
                            className="text-red-600"
                            onClick={() => setConfirmId(u.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between p-3 border-t text-sm">
              <button
                className="px-3 py-1.5 border rounded"
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                Previous
              </button>
              <div className="space-x-1">
                {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    className={`px-3 py-1.5 rounded border ${
                      n === (data?.data.pagination.current_page || 1)
                        ? 'bg-green-600 text-white border-green-600'
                        : ''
                    }`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                className="px-3 py-1.5 border rounded"
                disabled={page >= pages}
                onClick={() => setPage(Math.min(pages, page + 1))}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={editId !== null}
        onClose={() => setEditId(null)}
        title="Edit Customer"
        footer={
          <>
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setEditId(null)}
            >
              Cancel
            </button>
            <button
              form="editCustomerForm"
              type="submit"
              className="px-3 py-2 bg-green-600 text-white rounded"
            >
              Save
            </button>
          </>
        }
      >
        <form
          id="editCustomerForm"
          className="space-y-3"
          onSubmit={async e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget as HTMLFormElement)
            await update.mutateAsync({
              name: fd.get('name') ? String(fd.get('name')) : undefined,
              role: fd.get('role') ? String(fd.get('role')) : undefined,
              phone: fd.get('phone') ? String(fd.get('phone')) : undefined,
              address: fd.get('address') ? String(fd.get('address')) : undefined
            })
            setEditId(null)
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                name="name"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Role</label>
              <input
                name="role"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input
                name="phone"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Address
              </label>
              <input
                name="address"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Confirm delete customer"
        variant="danger"
        footer={
          <>
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setConfirmId(null)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-2 bg-red-600 text-white rounded"
              onClick={() => {
                if (confirmId) del.mutate(confirmId)
                setConfirmId(null)
              }}
            >
              Delete
            </button>
          </>
        }
      >
        Are you sure you want to delete this customer? This action cannot be
        undone.
      </Modal>
    </div>
  )
}
