import { X, Store } from 'lucide-react'
import { toast } from 'sonner'
import type { QuotedVoucher } from '../../services/couponService'
import { useClaimVoucher } from '../../hooks/useVouchers'
import { apiErrorMessage } from '../../../lib/apiError'
import { formatPrice } from '../../utils/formatMoney'
import { voucherTerms, voucherTitle, voucherValidity } from '../../utils/voucherText'

type Props = {
  vouchers: QuotedVoucher[]
  loading: boolean
  amount: number
  appliedCode: string | null
  onApply: (v: QuotedVoucher) => void
  onRemove: () => void
  onClose: () => void
}

// Modal chon voucher o checkout: kho + voucher luu duoc cua san va shop trong gio.
// Backend (/coupons/quote) da tinh san muc giam va ly do khong ap duoc.
export default function VoucherPicker({
  vouchers,
  loading,
  amount,
  appliedCode,
  onApply,
  onRemove,
  onClose
}: Props) {
  const claim = useClaimVoucher()
  // Thu tu: ap duoc truoc, trong kho truoc chua luu, roi muc giam cao truoc
  const rank = (v: QuotedVoucher) => Number(v.applicable) * 2 + Number(v.claimed)
  const sorted = [...vouchers].sort(
    (a, b) => rank(b) - rank(a) || b.discount - a.discount
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full min-w-0 relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white rounded-full p-1 hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Choose voucher</h3>
          <p className="text-sm text-gray-500 mb-4">
            Order value after tier discount: {formatPrice(amount)}
          </p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl px-4 py-5 bg-gray-50/60">
              No vouchers available for this cart.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {sorted.map(v => {
                const isApplied = appliedCode === v.code
                return (
                  <div
                    key={v.id}
                    data-testid={`checkout-voucher-${v.code}`}
                    className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                      isApplied
                        ? 'border-blue-500 bg-blue-50'
                        : v.applicable
                          ? 'border-blue-100 bg-blue-50/30'
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className={`min-w-0 ${v.applicable ? '' : 'opacity-70'}`}>
                      <p className="text-sm font-semibold text-blue-900">
                        {voucherTitle(v)}{' '}
                        <span className="font-mono text-xs font-normal text-gray-600">{v.code}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        <Store className="w-3 h-3 shrink-0" />
                        {v.shop ? v.shop.name : 'Platform'} · {voucherTerms(v)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{voucherValidity(v)}</p>
                      {v.applicable ? (
                        <p className="text-xs text-green-700 mt-1">Save {formatPrice(v.discount)}</p>
                      ) : (
                        <p className="text-xs text-red-500 mt-1">
                          {v.reason}
                          {/* Voucher san xet tren tong don: noi ro con thieu bao nhieu */}
                          {!v.shop && Number(v.min_order) > amount &&
                            ` · Add ${formatPrice(Number(v.min_order) - amount)} more to use it`}
                        </p>
                      )}
                    </div>
                    {!v.claimed ? (
                      <button
                        type="button"
                        disabled={claim.isPending}
                        onClick={() =>
                          claim.mutate(v.id, {
                            onSuccess: () => toast.success(`Collected ${v.code}`),
                            onError: err => toast.error(apiErrorMessage(err, 'Cannot collect this voucher'))
                          })
                        }
                        className="shrink-0 px-3 py-2 text-sm border border-rose-400 text-rose-600 rounded hover:bg-rose-50 disabled:opacity-50"
                      >
                        Collect
                      </button>
                    ) : isApplied ? (
                      <button
                        type="button"
                        onClick={onRemove}
                        className="shrink-0 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!v.applicable}
                        onClick={() => onApply(v)}
                        className="shrink-0 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
                      >
                        Choose
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
