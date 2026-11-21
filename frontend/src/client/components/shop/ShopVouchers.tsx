import { toast } from 'sonner'
import { Ticket, Check } from 'lucide-react'
import { useClaimVoucher, useShopVouchers } from '../../hooks/useVouchers'
import { apiErrorMessage } from '../../../lib/apiError'
import { voucherTerms, voucherTitle, voucherValidity } from '../../utils/voucherText'

// Voucher cua shop: bam "Collect" de luu vao kho, dung lai o checkout
const ShopVouchers = ({ slug, className = '' }: { slug: string; className?: string }) => {
  const { data: vouchers = [] } = useShopVouchers(slug)
  const claim = useClaimVoucher()
  if (!vouchers.length) return null

  const collect = (id: number) => {
    if (!localStorage.getItem('accessToken')) {
      toast.error('Please login to collect vouchers')
      return
    }
    claim.mutate(id, {
      onSuccess: () => toast.success('Voucher saved to your warehouse'),
      onError: err => toast.error(apiErrorMessage(err, 'Cannot collect this voucher'))
    })
  }

  return (
    <div className={className}>
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Ticket className="w-4 h-4 text-rose-500" /> Shop vouchers
      </h2>
      <div className="flex flex-wrap gap-3">
        {vouchers.map(v => (
          <div
            key={v.id}
            data-testid={`shop-voucher-${v.code}`}
            className="max-w-full flex items-center gap-3 border border-dashed border-rose-300 bg-rose-50/60 rounded-lg px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-rose-600">{voucherTitle(v)}</p>
              <p className="text-xs text-gray-600">{voucherTerms(v)}</p>
              <p className="text-[11px] text-gray-500">
                <span className="font-mono font-semibold text-gray-700">{v.code}</span>
                {' · '}
                {voucherValidity(v)}
              </p>
            </div>
            {v.claimed ? (
              <span className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded border border-rose-300 text-rose-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Collected
              </span>
            ) : (
              <button
                type="button"
                onClick={() => collect(v.id)}
                disabled={claim.isPending}
                className="shrink-0 px-3 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded hover:bg-rose-600 disabled:opacity-60"
              >
                Collect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShopVouchers
