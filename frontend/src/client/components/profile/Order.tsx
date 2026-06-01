import { useState, useMemo } from 'react'
import EmptyState from './EmptyStatus'
import OrderStatus from './OrderStatus'
import OrderDetails from './OrderDetail'
import OrderCard from './OrderCard'
import { useUserOrders } from '../../hooks/useUserOrders'
import { cancelMyOrder } from '../../services/orderService'
import { toast } from 'sonner'

const Order = () => {
  const ordersQuery = useUserOrders()
  const orders = ordersQuery.data
  const isLoading = ordersQuery.isLoading
  const [view, setView] = useState<'list' | 'detail' | 'empty'>('list')
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [orderTab, setOrderTab] = useState<
    'current' | 'delivered' | 'canceled' | 'returned'
  >('current')
  const [cancelling, setCancelling] = useState(false)

  const mappedOrders = useMemo(() => {
    if (!orders) return []
    return orders.map(o => ({
      id: o.id, // numeric id for API actions
      orderNumber: o.order_number || `#${o.id}`,
      placedOn: o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
      total: Number(o.total_amount || 0),
      delivered: o.status === 'delivered' ? 'Delivered' : undefined,
      sentTo: o.shipping_address?.name || 'You',
      address: o.shipping_address?.address,
      status: o.status as any,
      paymentType: o.payment_method || undefined,
      transactionId: o.id ? `#${o.id}` : '',
      amountPaid: Number(o.total_amount || 0),
      products: (o.order_items || []).map(oi => ({
        name: oi.product?.name || 'Product',
        quantity: oi.quantity,
        price: oi.unit_price,
        image:
          (Array.isArray(oi.product?.img) && oi.product?.img?.[0]) ||
          oi.product?.image_url ||
          'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'
      }))
    }))
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (!mappedOrders.length) return []
    if (orderTab === 'delivered') return mappedOrders.filter(o => o.status === 'delivered')
    if (orderTab === 'canceled') return mappedOrders.filter(o => o.status === 'cancelled')
    if (orderTab === 'current')
      return mappedOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    return []
  }, [mappedOrders, orderTab])

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order)
    setView('detail')
  }

  const handleCancel = async () => {
    if (!selectedOrder) return
    try {
      setCancelling(true)
      await cancelMyOrder(selectedOrder.id)
      toast.success('Order cancelled')
      setView('list')
      setSelectedOrder(null)
      ordersQuery.refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex max-w-7xl mx-auto">
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Order History</h1>
            <p className="text-gray-500">Track, return or purchase items</p>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : view === 'detail' && selectedOrder ? (
            <>
              {selectedOrder.status && (
                <OrderStatus status={selectedOrder.status} />
              )}
              <div className="flex justify-end mb-4">
                {selectedOrder.status !== 'delivered' &&
                  selectedOrder.status !== 'cancelled' && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
              </div>
              <OrderDetails order={selectedOrder} />
            </>
          ) : (
            <>
              <div className="flex space-x-6 mb-6 border-b border-gray-200">
                {[
                  {
                    key: 'current',
                    label: 'Current',
                    count: mappedOrders.filter(
                      o => o.status !== 'delivered' && o.status !== 'cancelled'
                    ).length
                  },
                  {
                    key: 'delivered',
                    label: 'Delivered',
                    count: mappedOrders.filter(o => o.status === 'delivered').length
                  },
                  {
                    key: 'canceled',
                    label: 'Canceled',
                    count: mappedOrders.filter(o => o.status === 'cancelled').length
                  },
                  { key: 'returned', label: 'Returned', count: 0 }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setOrderTab(tab.key as any)
                      setView(tab.count === 0 ? 'empty' : 'list')
                    }}
                    className={`pb-3 px-1 relative ${
                      orderTab === tab.key
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.label}{' '}
                    {tab.count > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                        {tab.count}
                      </span>
                    )}
                    {orderTab === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                    )}
                  </button>
                ))}
              </div>

              {view === 'empty' || filteredOrders.length === 0 ? (
                <EmptyState />
              ) : (
                <div>
                  {filteredOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => handleOrderClick(order)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Order
