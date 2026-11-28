import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit3, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminCoupons, useDeleteAdminCoupon } from '../../hooks/useCoupons'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import { CouponScope } from '../../types'
import CouponStatusChip from '../../../client/components/common/CouponStatusChip'
import ConfirmModal from '../../../client/components/common/ConfirmModal'
import { useListQueryParams } from '../../hooks/useListQueryParams'
import { fmtDate } from '../../utils/date'
import { formatPrice } from '../../../client/utils/formatMoney'

export default function AdminCouponsList() {
  const navigate = useNavigate()
  const [limit] = useState(10)
  const {
    page,
    q: query,
    setPage,
    setQ: setQuery,
    searchParams,
    setSearchParams
  } = useListQueryParams()
  const scopeParam = searchParams.get('scope')
  const scope: CouponScope | undefined =
    scopeParam === 'platform' || scopeParam === 'shop' ? scopeParam : undefined
  const setScope = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set('scope', value)
    else params.delete('scope')
    params.set('page', '1')
    setSearchParams(params)
  }

  const { data, isLoading } = useAdminCoupons({
    page,
    limit,
    q: query || undefined,
    scope
  })
  const del = useDeleteAdminCoupon()

  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  const onDelete = (id: number) => setConfirmId(id)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const renderActions = (id: number) => (
    <div className="flex items-center gap-3">
      <button title="Edit" className="text-blue-600" onClick={() => navigate(`/admin/coupons/${id}`)}>
        <Edit3 size={16} />
      </button>
      <button title="Delete" className="text-red-600" onClick={() => onDelete(id)}>
        <Trash2 size={16} />
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Coupons</h1>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            className="border rounded px-3 py-2 text-sm w-full sm:w-56 min-w-0"
            placeholder="Search by code"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select
            aria-label="Scope"
            className="border rounded px-3 py-2 text-sm"
            value={scope ?? ''}
            onChange={e => setScope(e.target.value)}
          >
            <option value="">All scopes</option>
            <option value="platform">Platform</option>
            <option value="shop">Shop vouchers</option>
          </select>
          <button
            className="px-3 py-2 bg-green-600 text-white rounded"
            onClick={() => navigate('/admin/coupons/new')}
          >
            New Coupon
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmId !== null}
        title="Delete coupon?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onClose={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId === null) return
          del.mutate(confirmId, {
            onSuccess: () => toast.success('Coupon deleted'),
            onError: () => toast.error('Failed to delete coupon'),
            onSettled: () => setConfirmId(null)
          })
        }}
      />

      <div className="bg-white rounded border">
        {isLoading ? (
          <SkeletonTable rows={5} cols={9} />
        ) : (
          <>
            {/* Mobile: moi coupon la 1 the, hanh dong luon hien */}
            <div className="md:hidden divide-y">
              {!data?.data.coupons?.length && (
                <div className="p-6 text-center text-gray-500">No coupons found</div>
              )}
              {data?.data.coupons?.map(c => (
                <div key={c.id} className="p-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium break-all">{c.code}</div>
                      <div className="text-xs text-gray-500">
                        {c.shop ? <span className="text-purple-700">{c.shop.name}</span> : 'Platform'}
                      </div>
                    </div>
                    <CouponStatusChip status={c.status} />
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.discount_type} {Number(c.discount_value)}
                    {c.discount_type === 'percent' && c.max_discount != null && ` (max $${Number(c.max_discount)})`}
                    {' · '}min {c.min_order ? Number(c.min_order) : '-'}
                    {' · '}used {c.used_count ?? 0}/{c.usage_limit ?? '∞'}
                    {' · '}exp {c.expires_at ? fmtDate(c.expires_at) : '—'}
                  </div>
                  {renderActions(c.id)}
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Scope</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Min Order</th>
                  <th className="text-left p-2">Usage</th>
                  <th className="text-left p-2">Expires</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.coupons?.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2 font-medium">{c.code}</td>
                    <td className="p-2">
                      {c.shop ? (
                        <span className="text-purple-700">{c.shop.name}</span>
                      ) : (
                        'Platform'
                      )}
                    </td>
                    <td className="p-2">
                      <CouponStatusChip status={c.status} />
                    </td>
                    <td className="p-2">{c.discount_type}</td>
                    <td className="p-2 whitespace-nowrap">
                      {Number(c.discount_value)}
                      {c.discount_type === 'percent' && c.max_discount != null && (
                        <span className="text-xs text-gray-500"> (max {formatPrice(c.max_discount)})</span>
                      )}
                    </td>
                    <td className="p-2">
                      {c.min_order ? Number(c.min_order) : '-'}
                    </td>
                    <td className="p-2">
                      {c.used_count ?? 0}/{c.usage_limit ?? '∞'}
                    </td>
                    <td className="p-2">
                      {c.expires_at
                        ? fmtDate(c.expires_at)
                        : '—'}
                    </td>
                    <td className="p-2">{renderActions(c.id)}</td>
                  </tr>
                ))}
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

    </div>
  )
}
