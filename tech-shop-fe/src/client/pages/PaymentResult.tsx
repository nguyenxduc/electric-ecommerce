import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'

const PaymentResult = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const responseCode = params.get('vnp_ResponseCode')
  const txnRef = params.get('vnp_TxnRef')
  const vnpAmount = params.get('vnp_Amount')
  const method = params.get('method') // cod | bank_transfer | vnpay (default)
  const order = params.get('order')
  const amountParam = params.get('amount')

  const isSuccess =
    method === 'cod' || method === 'bank_transfer'
      ? true
      : responseCode === '00'

  const amountDisplay =
    amountParam || vnpAmount
      ? `${Number(amountParam || vnpAmount) / 100} ₫`.replace('.00', '')
      : '—'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg w-full text-center space-y-4">
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}
        >
          {isSuccess ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
        </div>
        <h1 className="text-2xl font-semibold">
          {isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
        </h1>
        <p className="text-gray-600">
          {isSuccess
            ? method === 'cod'
              ? 'Đơn hàng của bạn sẽ được thanh toán khi nhận hàng (COD).'
              : method === 'bank_transfer'
              ? 'Đơn hàng đã tạo. Vui lòng hoàn tất chuyển khoản.'
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
          {method !== 'cod' && method !== 'bank_transfer' && (
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
          {!isSuccess && (
            <button
              onClick={() => navigate('/checkout')}
              className="px-5 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentResult

