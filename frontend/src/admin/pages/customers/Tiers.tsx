import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminCustomers, useUpdateAdminCustomerPoints } from '../../hooks'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'

export default function AdminCustomerTiersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [limit] = useState(10)
  const [draftPoints, setDraftPoints] = useState<Record<number, number>>({})
  const page = parseInt(searchParams.get('page') || '1', 10)
  const q = searchParams.get('q') || ''

  const { data, isLoading, refetch } = useAdminCustomers({
    page,
    limit,
    q: q || undefined
  })
  const updatePoints = useUpdateAdminCustomerPoints()

  const pages = useMemo(
    () => Math.max(1, data?.data.pagination.total_pages || 1),
    [data]
  )

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(newPage))
    setSearchParams(params)
  }

  const setQ = (newQuery: string) => {
    const params = new URLSearchParams(searchParams)
    if (newQuery) params.set('q', newQuery)
    else params.delete('q')
    params.set('page', '1')
    setSearchParams(params)
  }

  const currentTier = (user: any): string => {
    if (user.segment) return user.segment
    const pts = user.loyalty_points ?? 0
    if (pts >= 5000) return 'PLATINUM'
    if (pts >= 2000) return 'GOLD'
    if (pts >= 500) return 'SILVER'
    return 'BRONZE'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Customer loyalty points management</h1>
          <p className="text-sm text-gray-500">
            Set points directly. Tier and upgrade vouchers are handled automatically.
          </p>
        </div>
        <Link
          to="/admin/customers"
          className="px-3 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50"
        >
          Back to customers
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
          placeholder="Search name/email/phone"
        />
        <button className="px-3 py-2 border rounded" onClick={() => refetch()}>
          <Search size={16} />
        </button>
      </div>

      <div className="bg-white rounded border">
        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Points</th>
                  <th className="text-left p-2">Current Tier</th>
                  <th className="text-left p-2">Set Points</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data.users || []).map(user => {
                  const baseTier = currentTier(user)
                  const basePoints = user.loyalty_points ?? 0
                  const selectedPoints = draftPoints[user.id] ?? basePoints
                  const saving = updatePoints.isPending
                  return (
                    <tr key={user.id} className="border-t">
                      <td className="p-2">{user.name || '-'}</td>
                      <td className="p-2">{user.email || '-'}</td>
                      <td className="p-2">{(user.loyalty_points ?? 0).toLocaleString()}</td>
                      <td className="p-2">{baseTier}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          value={selectedPoints}
                          onChange={e =>
                            setDraftPoints(prev => ({
                              ...prev,
                              [user.id]: Number(e.target.value)
                            }))
                          }
                          className="border rounded px-2 py-1.5 w-32"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          disabled={saving || selectedPoints === basePoints}
                          onClick={async () => {
                            try {
                              await updatePoints.mutateAsync({
                                id: user.id,
                                payload: { loyalty_points: selectedPoints }
                              })
                              toast.success(`Points updated for ${user.name || user.email}`)
                            } catch (err: any) {
                              toast.error(
                                err?.response?.data?.message || 'Failed to update points'
                              )
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

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
