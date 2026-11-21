import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Edit3, Trash2, Search, Star, Ban, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAdminCustomers,
  useDeleteAdminCustomer,
  useSuspendCustomer,
  useUnsuspendCustomer,
  useUpdateAdminCustomer
} from '../../hooks'
import type { AdminCustomer } from '../../types'
import Modal from '../../components/common/Modal'
import ReasonModal from '../../components/common/ReasonModal'
import { apiErrorMessage } from '../../../lib/apiError'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import { useListQueryParams } from '../../hooks/useListQueryParams'
import { fmtDate } from '../../utils/date'

const TIER_STYLE: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  BRONZE:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Bronze',   icon: '🥉' },
  SILVER:   { bg: 'bg-slate-100',  text: 'text-slate-600',  label: 'Silver',   icon: '🥈' },
  GOLD:     { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Gold',     icon: '🥇' },
  PLATINUM: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Platinum', icon: '💎' },
}

// Gia tri role trong DB: nguoi mua la 'user'
const ROLE_OPTIONS = [
  { key: '', label: 'All roles' },
  { key: 'user', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
  { key: 'admin', label: 'Admin' }
]

const getTierFromPoints = (points: number) => {
  if (points >= 5000) return 'PLATINUM'
  if (points >= 2000) return 'GOLD'
  if (points >= 500)  return 'SILVER'
  return 'BRONZE'
}

export default function AdminCustomersList() {
  const [limit] = useState(10)
  const { page, q, setPage, setQ, searchParams, setSearchParams } = useListQueryParams()
  const role = searchParams.get('role') || ''
  const setRole = (v: string) => {
    const next = new URLSearchParams(searchParams)
    if (v) next.set('role', v)
    else next.delete('role')
    next.set('page', '1')
    setSearchParams(next)
  }

  const { data, isLoading, refetch } = useAdminCustomers({
    page,
    limit,
    q: q || undefined,
    role: role || undefined
  })
  const del = useDeleteAdminCustomer()
  const suspend = useSuspendCustomer()
  const unsuspend = useUnsuspendCustomer()
  const [suspendTarget, setSuspendTarget] = useState<AdminCustomer | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const update = useUpdateAdminCustomer(editId || 0)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Customers</h1>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link
            to="/admin/customers/tiers"
            className="px-3 py-2 border border-blue-200 text-blue-700 rounded text-sm hover:bg-blue-50"
          >
            Manage points
          </Link>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full sm:w-auto sm:flex-1 min-w-0"
            placeholder="Search name/email/phone"
          />
          <select
            aria-label="Filter by role"
            className="border rounded px-2 py-2 text-sm"
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
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
          <SkeletonTable rows={5} cols={9} />
        ) : (
          <>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Points</th>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Status</th>
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
                        {u.suspended_at ? (
                          <div className="min-w-[7rem]">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Suspended
                            </span>
                            {u.suspend_reason && (
                              <div className="text-xs text-red-600 mt-0.5">{u.suspend_reason}</div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {u.created_at
                          ? fmtDate(u.created_at)
                          : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {u.suspended_at ? (
                            <button
                              title="Unsuspend"
                              aria-label={`Unsuspend ${u.email}`}
                              className="text-green-700"
                              disabled={unsuspend.isPending}
                              onClick={() =>
                                unsuspend.mutate(u.id, {
                                  onSuccess: () => toast.success('Account unsuspended'),
                                  onError: err => toast.error(apiErrorMessage(err, 'Failed to unsuspend'))
                                })
                              }
                            >
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            // Admin khong khoa duoc admin (backend cung chan)
                            u.role !== 'admin' && (
                              <button
                                title="Suspend"
                                aria-label={`Suspend ${u.email}`}
                                className="text-orange-600"
                                onClick={() => setSuspendTarget(u)}
                              >
                                <Ban size={16} />
                              </button>
                            )
                          )}
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
            </table></div>

            <AdminPagination
              page={data?.data.pagination.current_page || page}
              totalPages={pages}
              onPageChange={setPage}
              totalItems={data?.data.pagination.total_count}
            />
          </>
        )}
      </div>

      {suspendTarget && (
        <ReasonModal
          title={`Suspend ${suspendTarget.email || suspendTarget.name || 'account'}`}
          description="The user is signed out everywhere and cannot sign in until unsuspended."
          confirmText="Suspend"
          pending={suspend.isPending}
          onClose={() => setSuspendTarget(null)}
          onConfirm={reason =>
            suspend.mutate(
              { id: suspendTarget.id, reason },
              {
                onSuccess: () => {
                  toast.success('Account suspended')
                  setSuspendTarget(null)
                },
                onError: err => toast.error(apiErrorMessage(err, 'Failed to suspend'))
              }
            )
          }
        />
      )}

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
        undone. Prefer Suspend if you may need to restore the account.
      </Modal>
    </div>
  )
}
