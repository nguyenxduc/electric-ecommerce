import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import ReasonModal from '../../components/common/ReasonModal'
import { useProductReports, useProductReportActions } from '../../hooks'
import { errMsg } from '../../services/opsService'
import type { ProductReportGroup } from '../../services/productReportService'
import { makeProductSlug } from '../../../client/utils/productSlug'

const STATUSES = ['open', 'resolved', 'dismissed']
const REASON_LABEL: Record<string, string> = {
  counterfeit: 'Counterfeit',
  prohibited: 'Prohibited',
  misleading: 'Misleading',
  offensive: 'Offensive',
  other: 'Other'
}

const topReason = (r: ProductReportGroup) => Object.entries(r.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other'

export default function AdminReportsPage() {
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<ProductReportGroup | null>(null)
  const { data, isLoading } = useProductReports({ status, page, limit: 10 })
  const { resolve, dismiss } = useProductReportActions()
  const pg = data?.pagination

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Product Reports</h1>

      <div className="flex gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded text-sm border capitalize ${status === s ? 'bg-gray-900 text-white' : 'bg-white'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        {isLoading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Shop</th>
                <th className="p-3">Reports</th>
                <th className="p-3">Reasons</th>
                <th className="p-3">Latest detail</th>
                {status === 'open' && <th className="p-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data?.reports.map(r => (
                <tr key={r.product?.id} className="border-t align-top">
                  <td className="p-3">
                    {r.product ? (
                      <Link
                        to={`/product/${makeProductSlug(r.product.name, r.product.id)}`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.product.name}
                      </Link>
                    ) : (
                      '-'
                    )}
                    {r.product?.taken_down_at && (
                      <span className="ml-2 text-xs rounded bg-red-100 text-red-700 px-1.5 py-0.5">taken down</span>
                    )}
                  </td>
                  <td className="p-3">{r.product?.shop?.name ?? '-'}</td>
                  <td className="p-3 font-semibold">{r.count}</td>
                  <td className="p-3 text-xs">
                    {Object.entries(r.reasons).map(([k, n]) => (
                      <div key={k}>
                        {REASON_LABEL[k] ?? k}: {n}
                      </div>
                    ))}
                  </td>
                  <td className="p-3 max-w-xs text-gray-600">{r.latest_detail ?? '-'}</td>
                  {status === 'open' && (
                    <td className="p-3 space-x-2 whitespace-nowrap">
                      <button
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                        onClick={() => setTarget(r)}
                      >
                        Take down
                      </button>
                      <button
                        className="px-2 py-1 border rounded text-xs"
                        disabled={dismiss.isPending}
                        onClick={() =>
                          r.product &&
                          dismiss.mutate(r.product.id, {
                            onSuccess: () => toast.success('Reports dismissed'),
                            onError: e => toast.error(errMsg(e, 'Failed to dismiss'))
                          })
                        }
                      >
                        Dismiss
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {data?.reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No {status} reports
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {pg && <AdminPagination page={page} totalPages={pg.total_pages} totalItems={pg.total_count} onPageChange={setPage} />}

      {target?.product && (
        <ReasonModal
          title={`Take down "${target.product.name}"`}
          description="The seller is notified with this reason and every reporter gets a thank-you."
          initialReason={`Reported as ${REASON_LABEL[topReason(target)].toLowerCase()} by buyers`}
          confirmText="Take down"
          pending={resolve.isPending}
          onClose={() => setTarget(null)}
          onConfirm={reason =>
            resolve.mutate(
              { productId: target.product!.id, reason },
              {
                onSuccess: () => {
                  toast.success('Product taken down')
                  setTarget(null)
                },
                onError: e => toast.error(errMsg(e, 'Failed to take down'))
              }
            )
          }
        />
      )}
    </div>
  )
}
