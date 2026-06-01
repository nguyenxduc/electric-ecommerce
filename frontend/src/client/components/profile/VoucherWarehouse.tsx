import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Ticket, AlertCircle } from 'lucide-react'
import { getMyCoupons } from '../../services/couponService'

type VoucherFilter = 'all' | 'usable' | 'used_up' | 'expired'

export default function VoucherWarehouse() {
  const [filter, setFilter] = useState<VoucherFilter>('all')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['coupons', 'my'],
    queryFn: getMyCoupons,
    staleTime: 60 * 1000
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Cannot load voucher warehouse now.</p>
      </div>
    )
  }

  const vouchers = data?.coupons ?? []
  const filterStats = useMemo(() => {
    const usable = vouchers.filter(v => v.is_usable).length
    const usedUp = vouchers.filter(v => v.is_exhausted).length
    const expired = vouchers.filter(v => v.is_expired).length
    return {
      all: vouchers.length,
      usable,
      used_up: usedUp,
      expired
    }
  }, [vouchers])

  const filteredVouchers = useMemo(() => {
    if (filter === 'usable') return vouchers.filter(v => v.is_usable)
    if (filter === 'used_up') return vouchers.filter(v => v.is_exhausted)
    if (filter === 'expired') return vouchers.filter(v => v.is_expired)
    return vouchers
  }, [filter, vouchers])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-4">Voucher warehouse</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs rounded-full border ${
            filter === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({filterStats.all})
        </button>
        <button
          type="button"
          onClick={() => setFilter('usable')}
          className={`px-3 py-1.5 text-xs rounded-full border ${
            filter === 'usable'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Usable ({filterStats.usable})
        </button>
        <button
          type="button"
          onClick={() => setFilter('used_up')}
          className={`px-3 py-1.5 text-xs rounded-full border ${
            filter === 'used_up'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Used up ({filterStats.used_up})
        </button>
        <button
          type="button"
          onClick={() => setFilter('expired')}
          className={`px-3 py-1.5 text-xs rounded-full border ${
            filter === 'expired'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Expired ({filterStats.expired})
        </button>
      </div>
      {filteredVouchers.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl px-4 py-5 bg-gray-50/60">
          No vouchers in this filter.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredVouchers.map(v => (
            <div
              key={v.id}
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                v.is_usable === false
                  ? 'border-gray-200 bg-gray-50 opacity-80'
                  : 'border-blue-100 bg-blue-50/30'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900 truncate">{v.code}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {v.discount_type === 'percent'
                    ? `Discount ${v.discount_value}%`
                    : `Discount ${Number(v.discount_value).toLocaleString()} VND`}
                  {v.min_order
                    ? ` • Min order ${Number(v.min_order).toLocaleString()} VND`
                    : ''}
                </p>
                {v.is_exhausted && (
                  <p className="text-xs text-red-500 mt-1">Used up</p>
                )}
                {v.is_expired && (
                  <p className="text-xs text-red-500 mt-1">Expired</p>
                )}
              </div>
              <p className="text-xs text-gray-500 shrink-0">
                Exp:{' '}
                {v.expires_at
                  ? new Date(v.expires_at).toLocaleDateString('en-GB')
                  : 'No expiry'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
