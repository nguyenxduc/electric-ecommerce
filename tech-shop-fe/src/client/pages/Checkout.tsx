import { useMemo, useState, useEffect } from 'react'
import {
  Truck,
  CreditCard,
  Home,
  Phone,
  User,
  CheckCircle,
  X,
  Copy,
  QrCode,
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart, useClearCart } from '../hooks/useCart'
import { useValidateToken } from '../hooks/useAuth'
import { usePublicSettings } from '../hooks/useSettings'

import { createOrder } from '../services/orderService'
import { toast } from 'sonner'
import {
  createBankTransferQR,
  type BankTransferQRResponse
} from '../services/paymentService'
import { validateCoupon } from '../services/couponService'

const Checkout = () => {
  const navigate = useNavigate()
  const { data: cartData, isLoading } = useCart()
  const { data: userData } = useValidateToken()
  const { data: settingsData } = usePublicSettings('shipping')

  const cart = cartData?.cart
  const items = cart?.items || []
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod')
  const [processing, setProcessing] = useState(false)
  const [qrData, setQrData] = useState<BankTransferQRResponse | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponResult, setCouponResult] = useState<{
    discount: number
    finalAmount: number
  } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const clearCartMutation = useClearCart()

  const totals = useMemo(() => {
    const subtotal = cart?.total_original_price || 0
    const discount = cart?.total_discount || 0
    const shippingCostValue = settingsData?.settings?.shipping_fee

    const freeShippingThreshold =
      settingsData?.settings?.free_shipping_threshold
    console.log('hello')
    console.log(shippingCostValue)
    const baseShippingCost = shippingCostValue ? Number(shippingCostValue) : 1
    const threshold = freeShippingThreshold
      ? Number(freeShippingThreshold)
      : 500000

    const orderTotal = cart?.total_price || 0
    const shipmentCost = orderTotal >= threshold ? 0 : baseShippingCost
    const isFreeShipping = orderTotal >= threshold

    const grandTotal = orderTotal + shipmentCost
    return {
      subtotal,
      discount,
      shipmentCost,
      grandTotal,
      isFreeShipping,
      freeShippingThreshold: threshold
    }
  }, [cart, settingsData])

  // Autofill receiver info from logged-in user
  useEffect(() => {
    const u = userData?.user
    if (u) {
      if (!name && u.name) setName(u.name)
      if (!phone && u.phone) setPhone(u.phone)
      if (!address && u.address) setAddress(u.address)
    }
  }, [userData?.user, name, phone, address])

  const createOrderFromCart = async (paymentMethod: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      throw new Error('NOT_AUTHENTICATED')
    }

    const orderItems = items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      color: item.color || null
    }))

    const orderPayload = {
      items: orderItems,
      shipping_address: {
        name,
        phone,
        address
      },
      payment_method: paymentMethod,
      coupon_code: appliedCoupon || undefined
    }

    const result = await createOrder(orderPayload)

    // Clear cart after successful order creation
    try {
      await clearCartMutation.mutateAsync()
    } catch (err) {
      console.error('Failed to clear cart:', err)
    }

    return result.order
  }

  const displayTotal = couponResult?.finalAmount ?? totals.grandTotal

  const handlePay = async () => {
    if (!items.length) {
      toast.error('Cart is empty')
      return
    }
    if (!address.trim() || !phone.trim() || !name.trim()) {
      toast.error('Please fill in contact and address info')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      toast.error('Please login to place an order')
      return
    }

    if (paymentMethod === 'cod') {
      try {
        setProcessing(true)
        const order = await createOrderFromCart('cod')
        toast.success('Order placed successfully - Pay on delivery')
        navigate(
          `/payment-result?method=cod&order=${order.order_number}&amount=${displayTotal}`
        )
      } catch (err: any) {
        if (err?.message === 'NOT_AUTHENTICATED') {
          toast.error('Please login to place an order')
        } else {
          toast.error(err?.response?.data?.message || 'Failed to create order')
        }
      } finally {
        setProcessing(false)
      }
      return
    }

    // Bank transfer - generate QR code first
    try {
      setProcessing(true)
      const data = await createBankTransferQR({
        amount: displayTotal,
        orderInfo: `Thanh toan don hang - ${name} - ${phone}`,
        accountName: name
      })
      setQrData(data)
      setShowQRModal(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create payment QR')
    } finally {
      setProcessing(false)
    }
  }

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleConfirmPayment = async () => {
    try {
      setProcessing(true)
      const order = await createOrderFromCart('bank_transfer')
      setShowQRModal(false)
      toast.success(
        'Order created successfully. Please complete the bank transfer.'
      )
      navigate(
        `/payment-result?method=bank_transfer&order=${order.order_number}&amount=${displayTotal}`
      )
    } catch (err: any) {
      if (err?.message === 'NOT_AUTHENTICATED') {
        toast.error('Please login to place an order')
      } else {
        toast.error(err?.response?.data?.message || 'Failed to create order')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleApplyCoupon = () => {
    const code = couponInput.trim()
    if (!code) {
      toast.error('Please enter a voucher code')
      return
    }
    setCouponLoading(true)
    validateCoupon(code, totals.grandTotal)
      .then(res => {
        setAppliedCoupon(code)
        setCouponResult({
          discount: res.discount,
          finalAmount: res.finalAmount
        })
        toast.success('Voucher applied')
      })
      .catch(err => {
        toast.error(err?.response?.data?.message || 'Invalid voucher')
        setAppliedCoupon(null)
        setCouponResult(null)
      })
      .finally(() => setCouponLoading(false))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-3 w-96">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 text-center space-y-4">
          <p className="text-lg text-gray-600">Your cart is empty</p>
          <button
            onClick={() => navigate('/collection/all')}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg"
          >
            Continue shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center gap-16">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <CartIcon />
              </div>
              <span className="text-sm font-medium text-blue-600 mt-2">
                Cart
              </span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-blue-600 mt-2">
                Checkout
              </span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-500 mt-2">
                Payment
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" /> Contact
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="border rounded-lg px-4 py-3"
                placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <div className="flex items-center gap-2 border rounded-lg px-4 py-3">
                <Phone className="w-4 h-4 text-gray-500" />
                <input
                  className="flex-1 outline-none"
                  placeholder="Phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" /> Shipping address
            </h2>
            <textarea
              className="w-full border rounded-lg px-4 py-3 min-h-[120px]"
              placeholder="Street, city, district..."
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Payment method
            </h2>
            <div className="space-y-3">
              <label className="border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-blue-200">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Pay on delivery (COD)
                  </p>
                  <p className="text-sm text-gray-500">
                    Thanh toán tiền mặt khi nhận hàng.
                  </p>
                </div>
              </label>

              <label className="border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-blue-200">
                <input
                  type="radio"
                  name="payment"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    Bank Transfer (QR Code)
                  </p>
                  <p className="text-sm text-gray-500">
                    Chuyển khoản qua mã QR ngân hàng.
                  </p>
                </div>
              </label>

              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full mt-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : paymentMethod === 'cod' ? (
                  'Place order (COD)'
                ) : (
                  'Generate QR Code'
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 h-fit">
          <h3 className="text-lg font-semibold mb-4">Order summary</h3>
          <div className="space-y-4 max-h-80 overflow-auto pr-1">
            {items.map(item => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={
                    item.image_url ||
                    'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'
                  }
                  alt={item.name}
                  className="h-14 w-14 object-contain bg-gray-50 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="text-sm font-semibold">
                  {(item.final_price * item.quantity).toLocaleString('vi-VN')} ₫
                </div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <input
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                placeholder="Enter voucher code"
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
            {appliedCoupon && (
              <div className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Applied: <span className="font-medium">{appliedCoupon}</span>
                {couponResult && (
                  <span className="text-xs text-gray-600">
                    (−{couponResult.discount.toLocaleString('vi-VN')} ₫)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  className="text-xs text-red-600 underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="border-t mt-4 pt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{totals.subtotal.toLocaleString('vi-VN')} ₫</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{totals.discount.toLocaleString('vi-VN')} ₫</span>
              </div>
            )}
            {couponResult && couponResult.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Voucher</span>
                <span>-{couponResult.discount.toLocaleString('vi-VN')} ₫</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipment</span>
              <span
                className={
                  totals.isFreeShipping ? 'text-green-600 font-medium' : ''
                }
              >
                {totals.isFreeShipping
                  ? 'Free!'
                  : `${totals.shipmentCost.toLocaleString('vi-VN')} ₫`}
              </span>
            </div>
            {totals.isFreeShipping && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                You qualified for free shipping!
              </div>
            )}
            {!totals.isFreeShipping && (
              <div className="text-xs text-gray-500">
                Add{' '}
                {(
                  totals.freeShippingThreshold - (cart?.total_price || 0)
                ).toLocaleString('vi-VN')}{' '}
                ₫ more for free shipping
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>{displayTotal.toLocaleString('vi-VN')} ₫</span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white rounded-full p-1 hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Bank Transfer Payment
                </h2>
                <p className="text-gray-600">
                  Scan QR code with your banking app to complete payment
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: QR Code */}
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm mb-4">
                    <img
                      src={qrData.qrUrl}
                      alt="Bank Transfer QR Code"
                      className="w-full max-w-[280px] h-auto"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Scan this QR code with your banking app
                  </p>
                </div>

                {/* Right: Payment Info */}
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">
                      Total Amount
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {qrData.amount.toLocaleString('vi-VN')} ₫
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-2">
                      Account Number
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold font-mono text-gray-900 break-all">
                        {qrData.accountNo}
                      </p>
                      <button
                        onClick={() => handleCopyAccount(qrData.accountNo)}
                        className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition"
                        title="Copy account number"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-2">
                      Account Name
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {qrData.accountName}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-2">
                      Transaction Content
                    </p>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 break-words flex-1">
                        {qrData.orderInfo}
                      </p>
                      <button
                        onClick={() => handleCopyAccount(qrData.orderInfo)}
                        className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition"
                        title="Copy content"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 font-medium mb-2">
                      Order ID
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-mono text-gray-700 break-all">
                        {qrData.orderId}
                      </p>
                      <button
                        onClick={() => handleCopyAccount(qrData.orderId)}
                        className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition"
                        title="Copy order ID"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-900 font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Payment Instructions
                </p>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Open your banking app on your phone</li>
                  <li>Tap on "Scan QR Code" or "Transfer" feature</li>
                  <li>Scan the QR code displayed above</li>
                  <li>Verify the amount and account information</li>
                  <li>Complete the transfer</li>
                  <li>Click "I've Completed Transfer" button below</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowQRModal(false)}
                  disabled={processing}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "I've Completed Transfer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M6 6h15l-1.5 9h-11z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="19" r="1" />
    <circle cx="18" cy="19" r="1" />
    <path
      d="M6 6L4 3H2"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default Checkout
