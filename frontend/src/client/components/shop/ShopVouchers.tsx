import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Ticket, Copy } from 'lucide-react'
import { getShopVouchers } from '../../services/shopService'

// Voucher cua shop dang ve; khong co API "luu voucher" nen bam = copy ma de nhap o checkout
const ShopVouchers = ({ slug, className = '' }: { slug: string; className?: string }) => {
  const { data: vouchers = [] } = useQuery({
    queryKey: ['shop-vouchers', slug],
    queryFn: () => getShopVouchers(slug)
  })
  if (!vouchers.length) return null

  return (
    <div className={className}>
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Ticket className="w-4 h-4 text-rose-500" /> Shop vouchers
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {vouchers.map(v => (
          <div
            key={v.id}
            className="shrink-0 flex items-center gap-3 border border-dashed border-rose-300 bg-rose-50/60 rounded-lg px-3 py-2"
          >
            <div>
              <p className="text-sm font-bold text-rose-600">
                {v.discount_type === 'percent'
                  ? `${Number(v.discount_value)}% OFF`
                  : `$${Number(v.discount_value)} OFF`}
              </p>
              <p className="text-xs text-gray-600 whitespace-nowrap">
                {v.min_order ? `Min order $${Number(v.min_order)}` : 'No minimum'}
                {v.expires_at ? ` · until ${new Date(v.expires_at).toLocaleDateString()}` : ''}
              </p>
            </div>
            <button
              onClick={() => {
                // clipboard chi co tren HTTPS/localhost; mo qua IP LAN thi bao ma de go tay
                if (!navigator.clipboard) {
                  toast.info(`Voucher code: ${v.code} - enter it at checkout`)
                  return
                }
                navigator.clipboard.writeText(v.code).then(
                  () => toast.success(`Copied code ${v.code} - apply it at checkout`),
                  () => toast.info(`Voucher code: ${v.code} - enter it at checkout`)
                )
              }}
              className="px-3 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded flex items-center gap-1 hover:bg-rose-600"
            >
              <Copy className="w-3 h-3" /> {v.code}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShopVouchers
