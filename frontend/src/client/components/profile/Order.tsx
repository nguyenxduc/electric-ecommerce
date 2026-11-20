import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from './EmptyStatus'
import OrderStatus from './OrderStatus'
import OrderDetails from './OrderDetail'
import OrderCard from './OrderCard'
import ConfirmModal from '../common/ConfirmModal'
import { ShopChatPanel } from '../chat/ChatWidget'
import { useUserOrders } from '../../hooks/useUserOrders'
import { useAddToCart } from '../../hooks/useCart'
import { cancelMyOrder, requestReturn } from '../../services/orderService'
import { toast } from 'sonner'
import { apiErrorMessage } from '../../../lib/apiError'
import { makeProductSlug } from '../../utils/productSlug'

type OrderTab = 'to_pay' | 'to_ship' | 'to_receive' | 'completed' | 'cancelled' | 'returns'

const CANCEL_REASONS = [
  'Changed my mind',
  'Found a better price',
  'Wrong address or details',
  'Ordered by mistake',
  'Other'
]

// Don online con pending = chua tra tien (callback thanh toan moi day sang processing)
const isUnpaidOnline = (o: { status?: string | null; paymentType?: string }) =>
  o.status === 'pending' && !!o.paymentType && o.paymentType !== 'cod'

// Tab giong app san (Shopee/Lazada): mot don co the nam o "Completed" lan "Return/Refund"
const TABS: Array<{
  key: OrderTab
  label: string
  match: (o: { status?: string | null; paymentType?: string; returnRequest: unknown }) => boolean
}> = [
  { key: 'to_pay', label: 'To pay', match: isUnpaidOnline },
  {
    key: 'to_ship',
    label: 'To ship',
    match: o => (o.status === 'pending' && !isUnpaidOnline(o)) || o.status === 'processing'
  },
  { key: 'to_receive', label: 'To receive', match: o => o.status === 'shipped' },
  { key: 'completed', label: 'Completed', match: o => o.status === 'delivered' },
  { key: 'cancelled', label: 'Cancelled', match: o => o.status === 'cancelled' },
  { key: 'returns', label: 'Return/Refund', match: o => o.status === 'returned' || !!o.returnRequest }
]

const Order = () => {
  const ordersQuery = useUserOrders()
  const orders = ordersQuery.data
  const isLoading = ordersQuery.isLoading
  const navigate = useNavigate()
  const addToCart = useAddToCart()
  type MappedOrder = (typeof mappedOrders)[number]
  const [selectedOrder, setSelectedOrder] = useState<MappedOrder | null>(null)
  const [orderTab, setOrderTab] = useState<OrderTab>('to_ship')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0])
  const [cancelling, setCancelling] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [chatShopId, setChatShopId] = useState<number | null>(null)
  const [buyingAgain, setBuyingAgain] = useState<number | null>(null)

  const mappedOrders = useMemo(() => {
    if (!orders) return []
    return orders.map(o => ({
      id: o.id, // numeric id for API actions
      orderNumber: o.order_number || `#${o.id}`,
      shopId: o.shop?.id,
      shopName: o.shop?.name,
      shopSlug: o.shop?.slug,
      groupNumber: o.order_group?.group_number,
      returnRequest: o.return_request || null,
      invoice: o.invoice || null,
      placedOn: o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
      total: Number(o.total_amount || 0),
      delivered: o.status === 'delivered' ? 'Delivered' : undefined,
      sentTo: o.shipping_address?.name || 'You',
      address: o.shipping_address?.address,
      status: o.status,
      paymentType: o.payment_method || undefined,
      transactionId: o.id ? `#${o.id}` : '',
      amountPaid: Number(o.total_amount || 0),
      products: (o.order_items || []).map(oi => ({
        productId: oi.product_id,
        slug: makeProductSlug(oi.product?.name || 'product', oi.product_id),
        variantId: oi.variant_id ?? undefined,
        color: oi.color || undefined,
        name: oi.product?.name || 'Product',
        quantity: oi.quantity,
        price: Number(oi.unit_price),
        variant: oi.variant_id
          ? (oi as { variant?: { name?: string } }).variant?.name ||
            oi.product?.variants?.find(v => v.id === oi.variant_id)?.name ||
            `Variant #${oi.variant_id}`
          : undefined,
        image:
          (Array.isArray(oi.product?.img) && oi.product?.img?.[0]) ||
          oi.product?.image_url ||
          'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'
      }))
    }))
  }, [orders])

  const counts = useMemo(
    () => Object.fromEntries(TABS.map(t => [t.key, mappedOrders.filter(t.match).length])),
    [mappedOrders]
  )
  const filteredOrders = useMemo(
    () => mappedOrders.filter(TABS.find(t => t.key === orderTab)!.match),
    [mappedOrders, orderTab]
  )

  const handleCancel = async () => {
    if (!selectedOrder) return
    try {
      setCancelling(true)
      await cancelMyOrder(selectedOrder.id, cancelReason)
      toast.success('Order cancelled')
      setCancelOpen(false)
      setSelectedOrder(null)
      ordersQuery.refetch()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to cancel order'))
    } finally {
      setCancelling(false)
    }
  }

  // Them lai dung san pham + bien the + mau vao gio roi sang trang gio hang
  const handleBuyAgain = async (order: MappedOrder) => {
    try {
      setBuyingAgain(order.id)
      for (const p of order.products) {
        await addToCart.mutateAsync({
          productId: p.productId,
          payload: { quantity: p.quantity, variant_id: p.variantId, color: p.color ?? null }
        })
      }
      navigate('/cart')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Some items could not be added to your cart'))
    } finally {
      setBuyingAgain(null)
    }
  }

  const handleRequestReturn = async () => {
    if (!selectedOrder || !returnReason.trim()) {
      toast.error('Please describe why you want to return this order')
      return
    }
    try {
      setReturnSubmitting(true)
      await requestReturn(selectedOrder.id, returnReason.trim())
      toast.success('Return request sent to the shop')
      setReturnOpen(false)
      setReturnReason('')
      setSelectedOrder(null)
      ordersQuery.refetch()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to send return request'))
    } finally {
      setReturnSubmitting(false)
    }
  }

  const cardActions = (order: MappedOrder) => ({
    onContact: order.shopId ? () => setChatShopId(order.shopId!) : undefined,
    onBuyAgain: order.status === 'delivered' ? () => handleBuyAgain(order) : undefined,
    buyingAgain: buyingAgain === order.id
  })

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Order History</h1>
        <p className="text-gray-500">Track, return or purchase items</p>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : selectedOrder ? (
        <>
          <button
            onClick={() => setSelectedOrder(null)}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back to orders
          </button>
          {selectedOrder.status && <OrderStatus status={selectedOrder.status} />}
          {selectedOrder.returnRequest && (
            <div
              className={`mb-4 border rounded-lg px-4 py-3 text-sm ${
                selectedOrder.returnRequest.status === 'approved'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : selectedOrder.returnRequest.status === 'rejected'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}
            >
              <p className="font-medium">
                Return request:{' '}
                <span className="capitalize">{selectedOrder.returnRequest.status}</span>
              </p>
              <p className="mt-1">Reason: {selectedOrder.returnRequest.reason}</p>
              {selectedOrder.returnRequest.resolution_note && (
                <p className="mt-1">Shop note: {selectedOrder.returnRequest.resolution_note}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            {selectedOrder.shopId && (
              <button
                onClick={() => setChatShopId(selectedOrder.shopId!)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Contact shop
              </button>
            )}
            {selectedOrder.status === 'delivered' && (
              <button
                onClick={() => handleBuyAgain(selectedOrder)}
                disabled={buyingAgain === selectedOrder.id}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {buyingAgain === selectedOrder.id ? 'Adding...' : 'Buy again'}
              </button>
            )}
            {selectedOrder.status === 'delivered' && !selectedOrder.returnRequest && (
              <button
                onClick={() => setReturnOpen(true)}
                className="px-4 py-2 border-2 border-orange-500 text-orange-600 rounded hover:bg-orange-50"
              >
                Request Return
              </button>
            )}
            {(selectedOrder.status === 'pending' || selectedOrder.status === 'processing') && (
              <button
                onClick={() => {
                  setCancelReason(CANCEL_REASONS[0])
                  setCancelOpen(true)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cancel Order
              </button>
            )}
          </div>
          {returnOpen && (
            <div className="mb-4 bg-white border rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Why do you want to return this order?</p>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="e.g. Product arrived damaged"
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button className="px-4 py-2 text-sm border rounded" onClick={() => setReturnOpen(false)}>
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-60"
                  disabled={returnSubmitting}
                  onClick={handleRequestReturn}
                >
                  {returnSubmitting ? 'Sending...' : 'Send request'}
                </button>
              </div>
            </div>
          )}
          <OrderDetails order={selectedOrder} />
          <ConfirmModal
            open={cancelOpen}
            title="Cancel this order?"
            description={
              selectedOrder.paymentType === 'cod'
                ? 'This is a cash-on-delivery order, so there is nothing to refund.'
                : 'If you already paid, the refund goes back to your original payment method.'
            }
            tone="danger"
            confirmText={cancelling ? 'Cancelling...' : 'Cancel order'}
            cancelText="Keep order"
            confirmDisabled={cancelling}
            onConfirm={handleCancel}
            onClose={() => setCancelOpen(false)}
          >
            <label htmlFor="cancel-reason" className="block mt-4 text-sm font-medium text-gray-700">
              Reason
            </label>
            <select
              id="cancel-reason"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            >
              {CANCEL_REASONS.map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </ConfirmModal>
        </>
      ) : (
        <>
          <div role="tablist" className="flex gap-6 mb-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
            {TABS.map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={orderTab === tab.key}
                onClick={() => setOrderTab(tab.key)}
                className={`pb-3 px-1 relative shrink-0 ${
                  orderTab === tab.key ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {counts[tab.key]}
                  </span>
                )}
                {orderTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyState message={mappedOrders.length ? 'No orders here yet' : undefined} />
          ) : (
            <div>
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => setSelectedOrder(order)}
                  {...cardActions(order)}
                />
              ))}
            </div>
          )}
        </>
      )}
      {chatShopId && (
        <ShopChatPanel shopId={chatShopId} open onClose={() => setChatShopId(null)} />
      )}
    </div>
  )
}

export default Order
