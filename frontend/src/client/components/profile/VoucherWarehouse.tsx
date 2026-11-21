import { useState } from 'react'
import { Ticket, AlertCircle, Store } from 'lucide-react'
import { useMyVouchers } from '../../hooks/useVouchers'
import {
  VOUCHER_STATUS_LABEL,
  voucherTerms,
  voucherTitle,
  voucherValidity
} from '../../utils/voucherText'

// "Usable" gom ca voucher sap dien ra: van con dung duoc sau nay
const isUsableTab = (status: string) => status === 'active' || status === 'scheduled'

export default function VoucherWarehouse() {
  const [tab, setTab] = useState<'usable' | 'history'>('usable')
  const { data, isLoading, isError } = useMyVouchers()

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
  const usable = vouchers.filter(v => isUsableTab(v.status))
  const history = vouchers.filter(v => !isUsableTab(v.status))
  const shown = tab === 'usable' ? usable : history

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm border-b-2 -mb-px ${
      active
        ? 'border-blue-600 text-blue-700 font-semibold'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">Voucher warehouse</h3>
      <div className="flex border-b border-gray-200 mb-4" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'usable'} onClick={() => setTab('usable')} className={tabCls(tab === 'usable')}>
          Usable ({usable.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')} className={tabCls(tab === 'history')}>
          Expired / Used ({history.length})
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl px-4 py-5 bg-gray-50/60">
          {tab === 'usable'
            ? 'No usable vouchers. Collect vouchers on shop and product pages.'
            : 'No expired or used vouchers.'}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map(v => (
            <div
              key={v.id}
              data-testid={`warehouse-voucher-${v.code}`}
              className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-3 ${
                v.status === 'active'
                  ? 'border-blue-100 bg-blue-50/30'
                  : 'border-gray-200 bg-gray-50 opacity-80'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Ticket className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="text-sm font-semibold text-blue-900">{voucherTitle(v)}</p>
                  <span className="font-mono text-xs text-gray-600">{v.code}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {v.shop ? v.shop.name : 'Platform voucher'}
                  {' · '}
                  {voucherTerms(v)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{voucherValidity(v)}</p>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
                  v.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : v.status === 'scheduled'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {VOUCHER_STATUS_LABEL[v.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
