import { useState } from 'react'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import { useValidateToken } from '../../hooks/useAuth'
import { useReportProduct } from '../../hooks/useProductReport'
import { REPORT_REASONS } from '../../services/productReportService'
import { openLoginModal } from '../../utils/loginModal'
import { apiErrorMessage, apiErrorResponse } from '../../../lib/apiError'

// Link "Report" + modal chon ly do; khach chua dang nhap thi mo modal dang nhap
export default function ReportProduct({ productId }: { productId: number }) {
  const { data: userData } = useValidateToken()
  const report = useReportProduct(productId)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')

  const close = () => {
    setOpen(false)
    setReason('')
    setDetail('')
  }
  const valid = reason !== '' && (reason !== 'other' || detail.trim() !== '')

  const submit = () =>
    report.mutate(
      { reason, detail: detail.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Thanks, we will review your report')
          close()
        },
        onError: e => {
          if (apiErrorResponse(e).status === 409) {
            toast.info('You already reported this product')
            close()
          } else toast.error(apiErrorMessage(e, 'Could not send report'))
        }
      }
    )

  return (
    <>
      <button
        type="button"
        onClick={() => (userData?.user ? setOpen(true) : openLoginModal())}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600"
      >
        <Flag className="w-4 h-4" /> Report this product
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Report product">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-lg space-y-3">
            <h2 className="font-semibold">Report this product</h2>
            <div className="space-y-2">
              {REPORT_REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              aria-label="Details"
              className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
              placeholder={reason === 'other' ? 'Please describe the problem (required)' : 'Details (optional)'}
              maxLength={500}
              value={detail}
              onChange={e => setDetail(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 border rounded text-sm" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50"
                disabled={!valid || report.isPending}
                onClick={submit}
              >
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
