import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react'
import { formatUsd } from '../utils/formatMoney'

const USD_TO_VND = Number(import.meta.env.VITE_USD_TO_VND_RATE || 25000)

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
    ? formatUsd(amountParam)
    : vnpAmount
      ? formatUsd(Number(vnpAmount) / 100 / USD_TO_VND)
      : '-'

  const formatMoney = (value: string | null) =>
    value != null ? formatUsd(value) : '-'

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
            ? 'Processing MoMo payment...'
            : isSuccess
              ? 'Payment successful'
              : 'Payment failed'}
        </h1>
        <p className="text-gray-600">
          {momoPending
            ? 'We are confirming your payment with MoMo. Please wait a moment...'
            : isSuccess
              ? method === 'cod'
                ? 'Your order will be paid when it is delivered (COD).'
                : method === 'bank_transfer'
                  ? 'Your order has been created. Please complete the bank transfer.'
                  : method === 'momo'
                    ? 'Your order has been created and paid successfully through MoMo.'
                    : 'Thank you for your VNPay payment.'
              : 'The payment failed. Please try again or choose another payment method.'}
        </p>

        <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-700 space-y-2">
          <div className="flex justify-between">
            <span>Transaction ID</span>
            <span className="font-semibold">{order || txnRef || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount</span>
            <span className="font-semibold">{amountDisplay}</span>
          </div>
          {subtotalParam && (
            <div className="flex justify-between">
              <span>Subtotal</span>
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
                <span>Response code</span>
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
              <span>Response code</span>
              <span className="font-semibold">{responseCode || '-'}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/collection/all')}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Continue shopping
          </button>
          {momoPending ? (
            <button
              onClick={() => navigate('/collection/all')}
              className="px-5 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              Check order
            </button>
          ) : !isSuccess ? (
            <button
              onClick={() => navigate('/checkout')}
              className="px-5 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PaymentResult

