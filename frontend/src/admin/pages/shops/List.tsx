import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, Ban, CircleSlash, Store } from 'lucide-react'
import adminShopService, { AdminShop } from '../../services/shopService'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import ConfirmModal from '../../../client/components/common/ConfirmModal'
import { useListQueryParams } from '../../hooks/useListQueryParams'

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' }
] as const

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-200 text-gray-700'
}

type ReasonAction = { type: 'reject' | 'suspend'; shop: AdminShop } | null

export default function AdminShopsList() {
  const [limit] = useState(10)
  const { page, q: query, setPage, setQ: setQuery } = useListQueryParams()
  const [statusTab, setStatusTab] = useState<string>('')
  const [approveShopTarget, setApproveShopTarget] = useState<AdminShop | null>(
    null
  )
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null)
  const [reason, setReason] = useState('')

  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-shops', page, limit, statusTab, query],
    queryFn: () =>
      adminShopService.list({
        page,
        limit,
        status: statusTab || undefined,
        search: query || undefined
      })
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-shops'] })

  const approveMut = useMutation({
    mutationFn: (id: number) => adminShopService.approve(id),
    onSuccess: () => {
      toast.success('Shop approved')
      invalidate()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to approve shop')
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminShopService.reject(id, reason),
    onSuccess: () => {
      toast.success('Shop rejected')
      invalidate()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to reject shop')
  })

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminShopService.suspend(id, reason),
    onSuccess: () => {
      toast.success('Shop suspended')
      invalidate()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to suspend shop')
  })

  const shops = data?.data?.data?.shops || []
  const pagination = data?.data?.data?.pagination
  const statusCounts = data?.data?.data?.status_counts || {}
  const pages = useMemo(
    () => Math.max(1, pagination?.total_pages || 1),
    [pagination]
  )

  const submitReason = () => {
    if (!reasonAction) return
    const payload = { id: reasonAction.shop.id, reason: reason || undefined }
    if (reasonAction.type === 'reject') rejectMut.mutate(payload)
    else suspendMut.mutate(payload)
    setReasonAction(null)
    setReason('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Store className="w-5 h-5" /> Shops
        </h1>
        <input
          className="border rounded px-3 py-2 text-sm w-64"
          placeholder="Search by name, slug or owner email"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-2 border-b">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusTab(tab.key)
              setPage(1)
            }}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              statusTab === tab.key
                ? 'border-green-600 text-green-700 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.key && statusCounts[tab.key] ? (
              <span className="ml-1 text-xs text-gray-500">
                ({statusCounts[tab.key]})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="bg-white rounded border">
        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="text-left p-2">Shop</th>
                  <th className="text-left p-2">Owner</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Products</th>
                  <th className="text-left p-2">Orders</th>
                  <th className="text-left p-2">Applied</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      No shops found
                    </td>
                  </tr>
                )}
                {shops.map(shop => (
                  <tr key={shop.id} className="border-t align-top">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {shop.logo_url ? (
                          <img
                            src={shop.logo_url}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                            <Store className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{shop.name}</div>
                          <div className="text-xs text-gray-500">
                            /{shop.slug}
                          </div>
                        </div>
                      </div>
                      {shop.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          Reason: {shop.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <div>{shop.owner?.name || '—'}</div>
                      <div className="text-xs text-gray-500">
                        {shop.owner?.email}
                      </div>
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGE[shop.status] || 'bg-gray-100'
                        }`}
                      >
                        {shop.status}
                      </span>
                    </td>
                    <td className="p-2">{shop._count?.products ?? 0}</td>
                    <td className="p-2">{shop._count?.orders ?? 0}</td>
                    <td className="p-2">
                      {new Date(shop.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {shop.status !== 'active' && (
                          <button
                            title="Approve"
                            className="text-green-600 flex items-center gap-1"
                            onClick={() => setApproveShopTarget(shop)}
                          >
                            <BadgeCheck className="w-4 h-4" /> Approve
                          </button>
                        )}
                        {shop.status === 'pending' && (
                          <button
                            title="Reject"
                            className="text-red-600 flex items-center gap-1"
                            onClick={() =>
                              setReasonAction({ type: 'reject', shop })
                            }
                          >
                            <CircleSlash className="w-4 h-4" /> Reject
                          </button>
                        )}
                        {shop.status === 'active' && (
                          <button
                            title="Suspend"
                            className="text-orange-600 flex items-center gap-1"
                            onClick={() =>
                              setReasonAction({ type: 'suspend', shop })
                            }
                          >
                            <Ban className="w-4 h-4" /> Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <AdminPagination
              page={pagination?.current_page || page}
              totalPages={pages}
              onPageChange={setPage}
              totalItems={pagination?.total_count}
            />
          </>
        )}
      </div>

      <ConfirmModal
        open={approveShopTarget !== null}
        title={`Approve "${approveShopTarget?.name}"?`}
        description="The shop becomes visible to buyers and its owner gains seller access."
        confirmText="Approve"
        cancelText="Cancel"
        confirmClassName="bg-green-600 hover:bg-green-700"
        onClose={() => setApproveShopTarget(null)}
        onConfirm={() => {
          if (approveShopTarget) approveMut.mutate(approveShopTarget.id)
          setApproveShopTarget(null)
        }}
      />

      {reasonAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              {reasonAction.type === 'reject' ? 'Reject' : 'Suspend'} "
              {reasonAction.shop.name}"
            </h3>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm min-h-[100px]"
              placeholder="Reason (shown to the shop owner)"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm border rounded"
                onClick={() => {
                  setReasonAction(null)
                  setReason('')
                }}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 text-sm text-white rounded ${
                  reasonAction.type === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
                onClick={submitReason}
              >
                {reasonAction.type === 'reject' ? 'Reject' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
