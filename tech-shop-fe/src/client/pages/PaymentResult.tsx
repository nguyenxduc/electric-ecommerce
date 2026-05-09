import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react'

const PaymentResult = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const responseCode = params.get('vnp_ResponseCode')
  const txnRef = params.get('vnp_TxnRef')
  const vnpAmount = params.get('vnp_Amount')
  const method = params.get('method') // cod | momo | bank_transfer | vnpay (default)
  const order = params.get('order')
  const amountParam = params.get('amount')
  const subtotalParam = params.get('subtotal')
  const tierDiscountParam = params.get('tierDiscount')
  const voucherDiscountParam = params.get('voucherDiscount')

  const momoResultCode = params.get('resultCode') ?? params.get('errorCode')
  const momoTransId = params.get('transId') ?? params.get('transID')
  const momoMessage = params.get('message') ?? params.get('errMsg')

  const momoPending = method === 'momo' && (momoResultCode == null || momoResultCode === '')
  const momoIsSuccess =
    method === 'momo' && momoResultCode != null
      ? String(momoResultCode) === '0' || String(momoResultCode) === '00'
      : false

  const isSuccess =
    method === 'cod' || method === 'bank_transfer'
      ? true
      : method === 'momo'
        ? momoIsSuccess
        : responseCode === '00'

  const amountDisplay = amountParam
    ? `${Number(amountParam).toLocaleString('vi-VN')} ₫`
    : vnpAmount
      ? `${(Number(vnpAmount) / 100).toLocaleString('vi-VN')} ₫`
      : '—'

  const formatMoney = (value: string | null) =>
    value != null ? `${Number(value).toLocaleString('vi-VN')} ₫` : '—'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg w-full text-center space-y-4">
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            momoPending
              ? 'bg-blue-100 text-blue-600'
              : isSuccess
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
          }`}
        >
          {momoPending ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle className="w-10 h-10" />
          ) : (
            <XCircle className="w-10 h-10" />
          )}
        </div>
        <h1 className="text-2xl font-semibold">
          {momoPending
            ? 'Đang xử lý MoMo...'
            : isSuccess
              ? 'Thanh toán thành công'
              : 'Thanh toán thất bại'}
        </h1>
        <p className="text-gray-600">
          {momoPending
            ? 'Chúng tôi đang xác nhận thanh toán với MoMo. Vui lòng đợi trong giây lát...'
            : isSuccess
              ? method === 'cod'
                ? 'Đơn hàng của bạn sẽ được thanh toán khi nhận hàng (COD).'
                : method === 'bank_transfer'
                  ? 'Đơn hàng đã tạo. Vui lòng hoàn tất chuyển khoản.'
                  : method === 'momo'
                    ? 'Đơn hàng đã tạo. Bạn đã thanh toán thành công qua MoMo.'
                    : 'Cảm ơn bạn đã thanh toán qua VNPay.'
              : 'Có lỗi khi thanh toán. Vui lòng thử lại hoặc chọn phương thức khác.'}
        </p>

        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-700 space-y-2">
          <div className="flex justify-between">
            <span>Mã giao dịch</span>
            <span className="font-semibold">{order || txnRef || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Số tiền</span>
            <span className="font-semibold">{amountDisplay}</span>
          </div>
          {subtotalParam && (
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span className="font-semibold">{formatMoney(subtotalParam)}</span>
            </div>
          )}
          {tierDiscountParam && Number(tierDiscountParam) > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Tier discount</span>
              <span className="font-semibold">-{formatMoney(tierDiscountParam)}</span>
            </div>
          )}
          {voucherDiscountParam && Number(voucherDiscountParam) > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Voucher discount</span>
              <span className="font-semibold">
                -{formatMoney(voucherDiscountParam)}
              </span>
            </div>
          )}
          {method === 'momo' && (
            <>
              <div className="flex justify-between">
                <span>Mã phản hồi</span>
                <span className="font-semibold">{momoResultCode ?? '-'}</span>
              </div>
              {momoTransId && (
                <div className="flex justify-between">
                  <span>transId</span>
                  <span className="font-semibold">{momoTransId}</span>
                </div>
              )}
              {momoMessage && (
                <div className="text-gray-600 break-words">
                  {momoMessage}
                </div>
              )}
            </>
          )}
          {method !== 'cod' && method !== 'bank_transfer' && method !== 'momo' && (
            <div className="flex justify-between">
              <span>Mã phản hồi</span>
              <span className="font-semibold">{responseCode || '-'}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/collection/all')}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tiếp tục mua sắm
          </button>
          {momoPending ? (
            <button
              onClick={() => navigate('/collection/all')}
              className="px-5 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              Kiểm tra đơn hàng
            </button>
          ) : !isSuccess ? (
            <button
              onClick={() => navigate('/checkout')}
              className="px-5 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Thử lại
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PaymentResult

