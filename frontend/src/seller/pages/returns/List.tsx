import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PackageX, Check, X } from 'lucide-react'
import {
  getShopReturns,
  resolveReturn,
  type ShopReturnRequest
} from '../../services/sellerService'
import { formatUsd } from '../../../client/utils/formatMoney'

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}

export default function SellerReturnsList() {
  const qc = useQueryClient()
  const [statusTab, setStatusTab] = useState<string>('')
  const [rejectTarget, setRejectTarget] = useState<ShopReturnRequest | null>(
    null
  )
  const [note, setNote] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['seller', 'returns', statusTab],
    queryFn: () => getShopReturns(statusTab || undefined)
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['seller', 'returns'] })
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
  }

  const resolveMut = useMutation({
    mutationFn: ({
      id,
      action,
      note
    }: {
      id: number
      action: 'approve' | 'reject'
      note?: string
    }) => resolveReturn(id, action, note),
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === 'approve'
          ? 'Return approved - items restocked, order marked as returned'
          : 'Return rejected'
      )
      invalidate()
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to resolve request')
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <PackageX className="w-5 h-5" /> Return Requests
      </h1>

      <div className="flex gap-2 border-b">
        {[
          { key: '', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              statusTab === tab.key
                ? 'border-blue-600 text-blue-700 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded border">
        {isLoading ? (
          <div className="p-6 animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="text-left p-2">Order</th>
                <th className="text-left p-2">Buyer</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Reason</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Requested</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No return requests.
                  </td>
                </tr>
              )}
              {requests.map(r => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-2 font-medium">
                    #{r.order.order_number || r.order.id}
                  </td>
                  <td className="p-2">
                    <div>{r.user?.name || '—'}</div>
                    <div className="text-xs text-gray-500">{r.user?.email}</div>
                  </td>
                  <td className="p-2">{formatUsd(r.order.total_amount)}</td>
                  <td className="p-2 max-w-[240px]">
                    <span className="text-gray-700">{r.reason}</span>
                    {r.resolution_note && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {r.resolution_note}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BADGE[r.status] || 'bg-gray-100'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-2">
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          className="text-green-600 flex items-center gap-1"
                          disabled={resolveMut.isPending}
                          onClick={() =>
                            resolveMut.mutate({ id: r.id, action: 'approve' })
                          }
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button
                          className="text-red-600 flex items-center gap-1"
                          onClick={() => setRejectTarget(r)}
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              Reject return for #{rejectTarget.order.order_number}
            </h3>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm min-h-[100px]"
              placeholder="Reason shown to the buyer"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm border rounded"
                onClick={() => {
                  setRejectTarget(null)
                  setNote('')
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm text-white rounded bg-red-600 hover:bg-red-700"
                onClick={() => {
                  resolveMut.mutate({
                    id: rejectTarget.id,
                    action: 'reject',
                    note: note || undefined
                  })
                  setRejectTarget(null)
                  setNote('')
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
