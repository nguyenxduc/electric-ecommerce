import { useMemo, useState, useEffect, useRef } from 'react'
import { PLACEHOLDER_IMAGE } from '../utils/placeholderImage'
import { apiErrorMessage, apiErrorResponse } from '../../lib/apiError'
import {
  Truck,
  CreditCard,
  Home,
  User,
  CheckCircle,
  X,
  Copy,
  QrCode,
  Loader2,
  Store,
  MapPin
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart, useClearCart, useRemoveCartItem } from '../hooks/useCart'
import { getExcluded, setExcluded, selectedItems, summarizeItems } from '../utils/cartSelection'
import { useValidateToken } from '../hooks/useAuth'
import { usePublicSettings } from '../hooks/useSettings'

import {
  cancelMyOrder,
  createOrder,
  quoteShipping,
  type ShippingQuote
} from '../services/orderService'
import PhoneVerification from '../components/profile/PhoneVerification'
import { AddressPickerModal } from '../components/profile/AddressBook'
import { useAddresses, useCreateAddress } from '../hooks/useAddresses'
import { formatAddress, type Address } from '../services/addressService'
import { toast } from 'sonner'
import {
  createMomoPayment,
  type BankTransferQRResponse
} from '../services/paymentService'
import { validateCoupon, type QuotedVoucher } from '../services/couponService'
import { useVoucherQuote } from '../hooks/useVouchers'
import VoucherPicker from '../components/checkout/VoucherPicker'
import { formatUsd } from '../utils/formatMoney'
import { canPayWithMomo, momoMinOrderUsd } from '../utils/gatewayAmount'
import { groupCartItemsByShop } from '../utils/groupCartItemsByShop'

const fieldCls =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const CheckoutField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
    {children}
  </label>
)

const Checkout = () => {
  const navigate = useNavigate()
  const { data: cartData, isLoading } = useCart()
  const { data: userData } = useValidateToken()
  const { data: settingsData } = usePublicSettings('shipping')

  const cart = cartData?.cart
  // Dong het hang (variant bi xoa) khong duoc gui len server; chi lay dong
  // nguoi mua chon o gio. Bo chon het thi KHONG dat gi (khong tu chon ca gio).
  const available = (cart?.items || []).filter(i => !i.unavailable)
  const items = selectedItems(available, getExcluded())
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [ward, setWard] = useState('')
  // So dia chi: dien san tu dia chi mac dinh va thu gon o nhap tay thanh the "Deliver to"
  const { data: savedAddresses = [] } = useAddresses()
  const createAddressMutation = useCreateAddress()
  const [addressId, setAddressId] = useState<number | null>(null)
  const [editingAddress, setEditingAddress] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saveAddress, setSaveAddress] = useState(false)
  const showManualAddress = !savedAddresses.length || editingAddress
  const applyAddress = (a: Address) => {
    setAddressId(a.id)
    setName(a.name)
    setPhone(a.phone)
    setProvince(a.province ?? '')
    setDistrict(a.district ?? '')
    setWard(a.ward ?? '')
    setAddress(a.street)
    setEditingAddress(false)
  }
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (prefilledRef.current || !savedAddresses[0]) return
    prefilledRef.current = true
    applyAddress(savedAddresses[0])
  }, [savedAddresses])
  const [wantInvoice, setWantInvoice] = useState(false)
  const [invoice, setInvoice] = useState({
    company_name: '',
    tax_code: '',
    address: '',
    email: ''
  })
  const [quote, setQuote] = useState<ShippingQuote | null>(null)
  const [needPhoneVerify, setNeedPhoneVerify] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod')
  const [processing, setProcessing] = useState(false)
  // setProcessing(true) only takes effect after a re-render, so a double
  // click/tap before that repaint can still slip a second submission
  // through the disabled button. This ref is checked synchronously instead.
  const isSubmittingRef = useRef(false)
  const [qrData, setQrData] = useState<BankTransferQRResponse | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [momoOrderMeta, setMomoOrderMeta] = useState<{
    orderNumber: string
    orderDbId: number
    amount: number
    voucherDiscount: number
    subtotal: number
    tierDiscount: number
  } | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponResult, setCouponResult] = useState<{
    discount: number
    finalAmount: number
    shopName?: string
  } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const clearCartMutation = useClearCart()
  const removeItemMutation = useRemoveCartItem()
  const loyaltyPoints = userData?.user?.loyalty_points ?? 0
  const userSegment = userData?.user?.segment ?? null
  const tierDiscountRate =
    userSegment === 'PLATINUM'
      ? 0.08
      : userSegment === 'GOLD'
        ? 0.05
        : userSegment === 'SILVER'
          ? 0.02
          : loyaltyPoints >= 5000
            ? 0.08
            : loyaltyPoints >= 2000
              ? 0.05
              : loyaltyPoints >= 500
                ? 0.02
                : 0

  const round2 = (n: number) => Math.round(n * 100) / 100

  // Group cart items by shop - checkout creates one order per shop, and each
  // shop charges its own shipping fee (shop override, else platform default).
  const shopGroups = useMemo(() => {
    const platformFee = Number(settingsData?.settings?.shipping_fee ?? 9.99)
    const platformThreshold = Number(
      settingsData?.settings?.free_shipping_threshold ?? 199
    )
    return groupCartItemsByShop(items).map(group => {
      const shop = group.items[0]?.shop
      const fee =
        shop?.shipping_fee_override != null
          ? Number(shop.shipping_fee_override)
          : platformFee
      const threshold =
        shop?.free_shipping_threshold_override != null
          ? Number(shop.free_shipping_threshold_override)
          : platformThreshold
      const subtotal = group.items.reduce(
        (sum, it) => sum + it.final_price * it.quantity,
        0
      )
      const estimated = subtotal >= threshold ? 0 : round2(fee)
      // Server quote wins when available; the estimate is the fallback
      const quoted = quote?.shops.find(
        s => String(s.shop_id) === String(group.key)
      )
      const shipping = quoted ? round2(Number(quoted.shipping)) : estimated
      return { ...group, subtotal, shipping, freeShipping: shipping === 0 }
    })
  }, [items, settingsData, quote])

  const totals = useMemo(() => {
    const { subtotal, discount, total: orderTotal } = summarizeItems(items)
    const shipmentCost = round2(
      shopGroups.reduce((sum, g) => sum + g.shipping, 0)
    )
    const isFreeShipping = shipmentCost === 0

    const grandTotal = orderTotal + shipmentCost
    return {
      subtotal,
      discount,
      merchandiseTotal: orderTotal,
      shipmentCost,
      grandTotal,
      isFreeShipping
    }
  }, [items, shopGroups])

  // Autofill receiver info from logged-in user
  useEffect(() => {
    const u = userData?.user
    // Da dien tu so dia chi thi khong ghi de bang thong tin ho so
    if (u && !prefilledRef.current) {
      if (!name && u.name) setName(u.name)
      if (!phone && u.phone) setPhone(u.phone)
      if (!address && u.address) setAddress(u.address)
    }
  }, [userData?.user, name, phone, address])

  // Debounced server-side shipping quote; failures fall back to the estimate
  const quoteKey = items.map(i => `${i.product_id}:${i.variant?.id ?? ''}:${i.quantity}`).join(',')
  useEffect(() => {
    if (!quoteKey || !address.trim() || !localStorage.getItem('accessToken')) {
      setQuote(null)
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      quoteShipping({
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          variant_id: i.variant?.id
        })),
        shipping_address: {
          name,
          phone,
          address,
          province: province || undefined,
          district: district || undefined,
          ward: ward || undefined
        }
      })
        .then(q => !cancelled && setQuote(q))
        .catch(() => !cancelled && setQuote(null))
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, address, province, district, ward])

  // Shared error handling for order creation (fraud/OTP 403 codes)
  const handleOrderError = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message === 'NOT_AUTHENTICATED') {
      toast.error('Please login to place an order')
      return
    }
    const { status, data } = apiErrorResponse(err)
    if (status === 403 && data?.code === 'PHONE_VERIFICATION_REQUIRED') {
      setNeedPhoneVerify(true)
      toast.error((data.message as string) || 'Please verify your phone number to continue')
      return
    }
    toast.error(apiErrorMessage(err, fallback))
  }

  const createOrderFromCart = async (paymentMethod: string, clearCart = true) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      throw new Error('NOT_AUTHENTICATED')
    }

    const orderItems = items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      color: item.color || null,
      variant_id: item.variant?.id
    }))

    const orderPayload = {
      items: orderItems,
      shipping_address: {
        name,
        phone,
        address,
        province: province.trim() || undefined,
        district: district.trim() || undefined,
        ward: ward.trim() || undefined
      },
      invoice_request:
        wantInvoice && invoice.company_name.trim() && invoice.tax_code.trim()
          ? {
              company_name: invoice.company_name.trim(),
              tax_code: invoice.tax_code.trim(),
              address: invoice.address.trim() || undefined,
              email: invoice.email.trim() || undefined
            }
          : undefined,
      payment_method: paymentMethod,
      coupon_code: appliedCoupon || undefined
    }

    const result = await createOrder(orderPayload)

    if (clearCart) await clearCartAfterOrder()

    return result
  }

  // Luu dia chi moi vao so dia chi; loi luu khong anh huong don. Chi dia chi nhap
  // tay (chua co trong so) de khong tao ban trung khi sua mot dia chi da luu.
  const saveAddressIfWanted = () => {
    if (!saveAddress || !showManualAddress || addressId) return
    createAddressMutation
      .mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        street: address.trim(),
        province: province.trim() || null,
        district: district.trim() || null,
        ward: ward.trim() || null
      })
      .catch(err => toast.warning(apiErrorMessage(err, 'Could not save the address to your address book')))
  }

  // Mua ca gio thi xoa gio; mua mot phan thi chi go cac dong da dat.
  // Goi khi don da chot (COD ngay sau khi dat; MoMo sau khi tao duoc thanh toan),
  // nen luu dia chi o day thay vi ngay sau createOrder (MoMo loi se huy don).
  const clearCartAfterOrder = async () => {
    saveAddressIfWanted()
    const ordered = items
    if (ordered.length === available.length) {
      try {
        await clearCartMutation.mutateAsync()
        setExcluded(new Set())
      } catch (err) {
        // Dong da mua con trong gio: bo chon het de lan sau khong dat lai
        setExcluded(new Set(available.map(i => i.id)))
        console.error('Failed to clear cart:', err)
      }
      return
    }
    const results = await Promise.allSettled(
      ordered.map(it => removeItemMutation.mutateAsync({ productId: it.product_id, cartItemId: it.id }))
    )
    const stuck = ordered.filter((_, i) => results[i].status === 'rejected').map(it => it.id)
    // Dong khong go duoc da duoc mua: giu o trang thai bo chon de khong dat trung
    setExcluded(new Set(stuck))
    if (stuck.length) {
      toast.warning(`${stuck.length} ordered item(s) are still in your cart. Remove them before checking out again.`)
    }
  }

  // Tier discount applies to merchandise only (matches the backend);
  // shipping is added on top after all discounts.
  const tierDiscountAmount = round2(
    totals.merchandiseTotal * tierDiscountRate
  )
  const amountAfterTierDiscount = Math.max(
    0,
    totals.merchandiseTotal - tierDiscountAmount
  )
  // Gio hang gui len de backend tinh voucher: tien hang sau uu dai hang, va
  // tung shop de kiem pham vi voucher shop (cung cong thuc voi createOrder).
  const voucherCart = useMemo(
    () => ({
      amount: round2(amountAfterTierDiscount),
      shopAmounts: Object.fromEntries(
        shopGroups
          .filter(g => /^\d+$/.test(g.key))
          .map(g => [g.key, round2(g.subtotal * (1 - tierDiscountRate))])
      )
    }),
    [amountAfterTierDiscount, shopGroups, tierDiscountRate]
  )
  const voucherQuote = useVoucherQuote(
    voucherCart,
    !!userData?.user && items.length > 0
  )
  const displayTotal = round2(
    Math.max(0, amountAfterTierDiscount - (couponResult?.discount ?? 0)) +
      totals.shipmentCost
  )

  const handlePay = async () => {
    if (isSubmittingRef.current) return
    if (!items.length) {
      toast.error('Cart is empty')
      return
    }
    if (!address.trim() || !phone.trim() || !name.trim()) {
      toast.error('Please fill in contact and address info')
      return
    }

    // Khong am tham bo qua yeu cau hoa don khi thieu thong tin
    if (wantInvoice && (!invoice.company_name.trim() || !invoice.tax_code.trim())) {
      toast.error('Please enter company name and tax code for the VAT invoice')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      toast.error('Please login to place an order')
      return
    }

    if (paymentMethod === 'cod') {
      try {
        isSubmittingRef.current = true
        setProcessing(true)
        const result = await createOrderFromCart('cod')
        toast.success('Order placed successfully - Pay on delivery')
        navigate(
          `/payment-result?method=cod&order=${result.order_group.group_number}&orders=${encodeURIComponent(
            result.orders.map(o => o.order_number).join(',')
          )}&amount=${result.finalAmount ?? displayTotal}&subtotal=${result.subtotal ?? totals.grandTotal}&tierDiscount=${result.tierDiscount ?? tierDiscountAmount}&voucherDiscount=${result.discount ?? 0}`
        )
      } catch (err) {
        handleOrderError(err, 'Failed to create order')
      } finally {
        isSubmittingRef.current = false
        setProcessing(false)
      }
      return
    }

    // MoMo Wallet: create order first, then create MoMo payment and redirect to payUrl.
    const momoPayAmount = displayTotal
    if (!canPayWithMomo(momoPayAmount)) {
      toast.error(
        `MoMo requires at least ~$${momoMinOrderUsd()} (1,000₫). Use COD or add more items.`
      )
      return
    }

    // Don da tao nhung chua tao duoc thanh toan: huy ngay de tra kho/voucher,
    // neu khong gio con nguyen va khach thu lai se tao don thu hai.
    let pendingOrderIds: number[] = []
    const rollbackPendingOrders = () =>
      Promise.allSettled(pendingOrderIds.map(id => cancelMyOrder(id)))
    try {
      isSubmittingRef.current = true
      setProcessing(true)
      const orderResult = await createOrderFromCart('momo', false)
      pendingOrderIds = (orderResult.orders ?? []).map((o: { id: number }) => Number(o.id))
      // Number() tra ve NaN chu khong bao gio nullish, nen chuoi ?? cu khien
      // nhanh du phong momoPayAmount khong bao gio chay: total_amount thieu se
      // cho ra NaN va don hang vua tao bi ket o trang thai chua thanh toan.
      const groupTotal = Number(orderResult.order_group?.total_amount)
      const serverPayAmount =
        orderResult.finalAmount ??
        (Number.isFinite(groupTotal) ? groupTotal : momoPayAmount)

      if (!canPayWithMomo(serverPayAmount)) {
        await rollbackPendingOrders()
        toast.error(
          `Order total is too low for MoMo (min ~$${momoMinOrderUsd()}). Use COD instead.`
        )
        return
      }

      // One MoMo payment covers the whole checkout (all shop-orders).
      const momoData = await createMomoPayment({
        amount: serverPayAmount,
        orderInfo: `Order payment - ${name} - ${phone}`,
        order_group_id: orderResult.order_group.id,
        orderNumber: orderResult.order_group.group_number
      })
      pendingOrderIds = []
      // Luu so tien/giam gia truoc khi xoa gio: xoa gio doi quoteKey va xoa
      // couponResult, trang ket qua se hien 0 neu doc lai tu state.
      setMomoOrderMeta({
        orderNumber: orderResult.order_group.group_number,
        orderDbId: orderResult.order_group.id,
        amount: serverPayAmount,
        voucherDiscount: couponResult?.discount ?? 0,
        // Chup lai truoc khi go dong khoi gio: sau do `items` doi sang dong con lai
        subtotal: totals.grandTotal,
        tierDiscount: tierDiscountAmount
      })
      // Chi xoa gio sau khi tao thanh toan thanh cong de loi thi gio van con
      await clearCartAfterOrder()

      const target = momoData.payUrl || momoData.deeplink
      if (target) {
        window.location.href = target
        return
      }

      // Fallback: show QR if no payUrl/deeplink is returned.
      setQrData(momoData)
      setShowQRModal(true)
    } catch (err) {
      await rollbackPendingOrders()
      handleOrderError(err, 'Failed to create MoMo payment')
    } finally {
      isSubmittingRef.current = false
      setProcessing(false)
    }
  }

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleConfirmPayment = async () => {
    if (isSubmittingRef.current) return
    try {
      isSubmittingRef.current = true
      setProcessing(true)
      if (momoOrderMeta) {
        setShowQRModal(false)
        toast.success('MoMo request created. Waiting for confirmation...')
        navigate(
          `/payment-result?method=momo&order=${encodeURIComponent(
            momoOrderMeta.orderNumber
          )}&amount=${momoOrderMeta.amount}&subtotal=${momoOrderMeta.subtotal}&tierDiscount=${momoOrderMeta.tierDiscount}&voucherDiscount=${
            momoOrderMeta.voucherDiscount
          }`
        )
        return
      }

      const result = await createOrderFromCart('momo')
      setShowQRModal(false)
      toast.success('Order created successfully. Please complete MoMo payment.')
      navigate(
        `/payment-result?method=momo&order=${result.order_group.group_number}&orders=${encodeURIComponent(
          result.orders.map(o => o.order_number).join(',')
        )}&amount=${result.finalAmount ?? displayTotal}&subtotal=${result.subtotal ?? totals.grandTotal}&tierDiscount=${result.tierDiscount ?? tierDiscountAmount}&voucherDiscount=${result.discount ?? 0}`
      )
    } catch (err) {
      handleOrderError(err, 'Failed to create order')
    } finally {
      isSubmittingRef.current = false
      setProcessing(false)
    }
  }

  // Backend da tinh muc giam theo pham vi shop + tran giam, chi viec hien
  const setVoucher = (
    code: string,
    discount: number,
    shopName?: string
  ) => {
    markVoucherTouched()
    setAppliedCoupon(code)
    setCouponInput(code)
    setCouponResult({ discount, finalAmount: 0, shopName })
  }

  // Gio hang doi thi ban xem truoc giam gia khong con dung
  useEffect(() => {
    setAppliedCoupon(null)
    setCouponResult(null)
  }, [quoteKey])

  // Tu chon voucher giam nhieu nhat trong kho, mot lan cho moi gio hang; nguoi
  // dung bo chon thi khong chon lai. Chay sau effect reset o tren.
  const autoPickedFor = useRef<string | null>(null)
  // Nguoi dung da tu chon / bo / nhap ma: auto-pick ve sau (quote tra cham) khong duoc de len
  const markVoucherTouched = () => {
    autoPickedFor.current = quoteKey
  }
  useEffect(() => {
    if (!voucherQuote.data || autoPickedFor.current === quoteKey) return
    autoPickedFor.current = quoteKey
    const best = voucherQuote.data
      .filter(v => v.claimed && v.applicable && v.discount > 0)
      .sort((a, b) => b.discount - a.discount)[0]
    if (!best) return
    setAppliedCoupon(best.code)
    setCouponInput(best.code)
    setCouponResult({ discount: best.discount, finalAmount: 0, shopName: best.shop?.name })
  }, [voucherQuote.data, quoteKey])

  const handleApplyCoupon = () => {
    markVoucherTouched()
    const code = couponInput.trim()
    if (!code) {
      toast.error('Please enter a voucher code')
      return
    }
    setCouponLoading(true)
    validateCoupon(code, voucherCart)
      .then(res => {
        setVoucher(code, res.discount, res.coupon.shop?.name)
        toast.success('Voucher applied')
      })
      .catch(err => {
        toast.error(apiErrorMessage(err, 'Invalid voucher'))
        setAppliedCoupon(null)
        setCouponResult(null)
      })
      .finally(() => setCouponLoading(false))
  }

  const handleApplyMyVoucher = (voucher: QuotedVoucher) => {
    setVoucher(voucher.code, voucher.discount, voucher.shop?.name)
    setShowVoucherModal(false)
    toast.success('Voucher applied')
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

  // Don MoMo da tao (gio da go dong da dat): khong hien lai form voi dong con
  // lai, tranh nguoi mua bam dat lan nua thanh don thu hai.
  if (momoOrderMeta && !showQRModal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white shadow rounded-lg p-8 text-center space-y-4 max-w-md">
          <p className="text-lg font-semibold text-gray-900">Order {momoOrderMeta.orderNumber} created</p>
          <p className="text-sm text-gray-600">It is waiting for your MoMo payment.</p>
          <button
            onClick={handleConfirmPayment}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg"
          >
            View order status
          </button>
        </div>
      </div>
    )
  }

  // For MoMo: we may create an order and clear the cart before we redirect to MoMo.
  // Avoid showing "Your cart is empty" while we're in the middle of creating MoMo payment.
  if (!items.length && !processing && !showQRModal && !momoOrderMeta && !qrData) {
    const nothingSelected = available.length > 0
    // Gio con dong nhung deu khong mua duoc (an/het bien the): dua ve gio de go bo
    const onlyUnavailable = !available.length && (cart?.items?.length ?? 0) > 0
    const toCart = nothingSelected || onlyUnavailable
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 text-center space-y-4">
          <p className="text-lg text-gray-600">
            {nothingSelected
              ? 'No items selected for checkout'
              : onlyUnavailable
                ? 'Items in your cart are no longer available'
                : 'Your cart is empty'}
          </p>
          <button
            onClick={() => navigate(toCart ? '/cart' : '/collection/all')}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg"
          >
            {toCart ? 'Back to cart' : 'Continue shopping'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 lg:pb-12 overflow-x-hidden">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center justify-center gap-3 sm:gap-16">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <CartIcon />
              </div>
              <span className="text-sm font-medium text-blue-600 mt-2">
                Cart
              </span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-gray-300" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-blue-600 mt-2">
                Checkout
              </span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-gray-300" />
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 sm:gap-8">
        <div className="space-y-6 min-w-0">
          {pickerOpen && (
            <AddressPickerModal selectedId={addressId} onPick={applyAddress} onClose={() => setPickerOpen(false)} />
          )}
          {!showManualAddress && (
            <div className="bg-white rounded-lg shadow p-6" data-testid="deliver-to">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" /> Deliver to
                </h2>
                <div className="flex gap-3 text-sm shrink-0">
                  <button onClick={() => setEditingAddress(true)} className="text-gray-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => setPickerOpen(true)} className="font-medium text-blue-600 hover:underline">
                    Change
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-900 break-words">
                  {name} <span className="text-gray-400">|</span> <span className="text-gray-600 font-normal">{phone}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 break-words">
                  {formatAddress({ street: address, ward, district, province })}
                </p>
              </div>
            </div>
          )}
          {showManualAddress && (<>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" /> Contact
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <CheckoutField label="Receiver name">
                <input
                  className={fieldCls}
                  placeholder="Full name"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </CheckoutField>
              <CheckoutField label="Phone number">
                <input
                  type="tel"
                  className={fieldCls}
                  placeholder="Phone number"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </CheckoutField>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" /> Shipping address
            </h2>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <CheckoutField label="Province / City">
                <input className={fieldCls} placeholder="Province / City" value={province} onChange={e => setProvince(e.target.value)} />
              </CheckoutField>
              <CheckoutField label="District">
                <input className={fieldCls} placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} />
              </CheckoutField>
              <CheckoutField label="Ward">
                <input className={fieldCls} placeholder="Ward" value={ward} onChange={e => setWard(e.target.value)} />
              </CheckoutField>
            </div>
            <CheckoutField label="Street address">
              <textarea
                className={`${fieldCls} min-h-[96px]`}
                placeholder="Street, city, district..."
                autoComplete="street-address"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </CheckoutField>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {!addressId && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={e => setSaveAddress(e.target.checked)}
                  className="h-4 w-4"
                />
                Save this address to my address book
              </label>
              )}
              {savedAddresses.length > 0 && (
                <button onClick={() => setPickerOpen(true)} className="text-sm font-medium text-blue-600 hover:underline">
                  Choose a saved address
                </button>
              )}
            </div>
          </div>
          </>)}

          {needPhoneVerify && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-amber-800">
                Your phone number must be verified before placing this order.
                Verify it below, then place your order again.
              </p>
              <PhoneVerification onVerified={() => setNeedPhoneVerify(false)} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <label className="flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={wantInvoice}
                onChange={e => setWantInvoice(e.target.checked)}
                className="h-4 w-4"
              />
              Request company VAT invoice
            </label>
            {wantInvoice && (
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                {(
                  [
                    ['company_name', 'Company name'],
                    ['tax_code', 'Tax code'],
                    ['address', 'Company address'],
                    ['email', 'Invoice email']
                  ] as const
                ).map(([key, label]) => (
                  <input
                    key={key}
                    className="border rounded-lg px-4 py-3"
                    placeholder={label}
                    value={invoice[key]}
                    onChange={e =>
                      setInvoice(v => ({ ...v, [key]: e.target.value }))
                    }
                  />
                ))}
              </div>
            )}
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
                    Pay with cash when your order is delivered.
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
                    MoMo Wallet (QR)
                  </p>
                  <p className="text-sm text-gray-500">
                    Pay through the MoMo sandbox. Unpaid orders are held for
                    30 minutes, then cancelled automatically.
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
                  'Pay with MoMo'
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 h-fit min-w-0">
          <h3 className="text-lg font-semibold mb-4">Order summary</h3>
          {shopGroups.length > 1 && (
            <p className="text-xs text-gray-500 mb-3">
              Items from {shopGroups.length} shops — your checkout will create
              one order per shop.
            </p>
          )}
          <div className="space-y-4 max-h-80 overflow-auto pr-1">
            {shopGroups.map(group => (
              <div key={group.key}>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
                  <Store className="h-3.5 w-3.5" />
                  {group.shopName}
                </div>
                <div className="space-y-3 pl-1">
                  {group.items.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={
                          item.image_url ||
                          PLACEHOLDER_IMAGE
                        }
                        alt={item.name}
                        className="h-14 w-14 object-contain bg-gray-50 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-500">
                            {item.variant.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatUsd(item.final_price * item.quantity)}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-gray-500 border-t border-dashed pt-1.5">
                    <span>Shipping ({group.shopName})</span>
                    <span
                      className={group.freeShipping ? 'text-green-600' : ''}
                    >
                      {group.freeShipping ? 'Free' : formatUsd(group.shipping)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-2 text-sm text-gray-600">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                placeholder="Enter voucher code"
                className="flex-1 min-w-0 border rounded px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setShowVoucherModal(true)}
                className="w-full px-3 py-2 text-sm border border-blue-200 text-blue-700 rounded hover:bg-blue-50"
              >
                Vouchers
              </button>
            </div>
            {appliedCoupon && (
              <div className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Applied: <span className="font-medium">{appliedCoupon}</span>
                {couponResult && (
                  <span className="text-xs text-gray-600">
                    (-{formatUsd(couponResult.discount)})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null)
                    setCouponResult(null)
                  }}
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
              <span>{formatUsd(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatUsd(totals.discount)}</span>
              </div>
            )}
            {tierDiscountRate > 0 && (
              <div className="flex justify-between text-green-700">
                <span>
                  Tier discount ({Math.round(tierDiscountRate * 100)}%)
                </span>
                <span>-{formatUsd(tierDiscountAmount)}</span>
              </div>
            )}
            {couponResult && couponResult.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>
                  Voucher
                  {couponResult.shopName ? ` (${couponResult.shopName})` : ''}
                </span>
                <span>-{formatUsd(couponResult.discount)}</span>
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
                  : formatUsd(totals.shipmentCost)}
              </span>
            </div>
            {totals.isFreeShipping && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                You qualified for free shipping!
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>{formatUsd(displayTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: thanh dat hang dinh day */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-rose-600 leading-tight">{formatUsd(displayTotal)}</p>
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={processing}
          className="ml-auto h-11 px-6 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : paymentMethod === 'cod' ? (
            'Place order'
          ) : (
            'Pay with MoMo'
          )}
        </button>
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
                  MoMo Payment
                </h2>
                <p className="text-gray-600">
                  Scan QR using MoMo app or open payment link
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: QR Code */}
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm mb-4">
                    <img
                      src={qrData.qrUrl}
                      alt="MoMo QR Code"
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
                      {formatUsd(qrData.amount)}
                    </p>
                  </div>

                  {(qrData.payUrl || qrData.deeplink) && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-2">
                        Payment Link
                      </p>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 break-words flex-1">
                          {qrData.payUrl || qrData.deeplink}
                        </p>
                        <button
                          onClick={() =>
                            handleCopyAccount(qrData.payUrl || qrData.deeplink || '')
                          }
                          className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition"
                          title="Copy payment link"
                        >
                          <Copy className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <button
                        onClick={() => window.open(qrData.payUrl || qrData.deeplink, '_blank')}
                        className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Open MoMo Payment
                      </button>
                    </div>
                  )}

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
                  <li>Open MoMo app on your phone</li>
                  <li>Tap scan QR feature in MoMo</li>
                  <li>Scan the QR code displayed above</li>
                  <li>Verify amount and confirm payment</li>
                  <li>Click "I've Completed Payment" button below</li>
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
                    "I've Completed Payment"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voucher list modal */}
      {showVoucherModal && (
        <VoucherPicker
          vouchers={voucherQuote.data ?? []}
          loading={voucherQuote.isLoading}
          amount={amountAfterTierDiscount}
          appliedCode={appliedCoupon}
          onApply={handleApplyMyVoucher}
          onRemove={() => {
            markVoucherTouched()
            setAppliedCoupon(null)
            setCouponResult(null)
          }}
          onClose={() => setShowVoucherModal(false)}
        />
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
