import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShopFinance } from '../../../admin/hooks'
import { formatUsd } from '../../../client/utils/formatMoney'

const STATUS_CLASS: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-blue-100 text-blue-700'
}

// "My income": tien da ve (don da giao), tien dang cho (dang xu ly/giao), phi san
export default function SellerFinance() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading, error } = useShopFinance({
    from: from || undefined,
    to: to || undefined
  })
  const pct = data ? ` (${(data.rate * 100).toFixed(0)}%)` : ''

  const cards = [
    { title: 'Released', value: data?.released.amount, hint: `${data?.released.count ?? 0} delivered orders` },
    { title: 'Pending', value: data?.pending.amount, hint: `${data?.pending.count ?? 0} processing / shipped` },
    { title: `Platform fee${pct}`, value: data?.fee, hint: 'On released revenue' },
    { title: 'Net income', value: data?.net, hint: 'Released minus platform fee' }
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">My Income</h1>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-gray-500">From</span>
            <input
              type="date"
              className="border rounded px-2 py-1 bg-white"
              value={from}
              max={to || undefined}
              onChange={e => setFrom(e.target.value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500">To</span>
            <input
              type="date"
              className="border rounded px-2 py-1 bg-white"
              value={to}
              min={from || undefined}
              onChange={e => setTo(e.target.value)}
            />
          </label>
          {(from || to) && (
            <button
              onClick={() => {
                setFrom('')
                setTo('')
              }}
              className="px-3 py-1 rounded border bg-white hover:bg-gray-50"
            >
              All time
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700">
          Failed to load income. Please retry.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(c => (
              <div key={c.title} className="bg-white rounded-lg border p-4 min-w-0">
                <div className="text-xs text-gray-500">{c.title}</div>
                <div className="mt-1 text-xl md:text-2xl font-semibold truncate">
                  {isLoading ? '...' : formatUsd(c.value ?? 0)}
                </div>
                <div className="mt-1 text-xs text-gray-400">{c.hint}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded border">
            <div className="px-3 py-2 border-b font-medium">Recent orders</div>
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : !data?.orders.length ? (
              <div className="p-6 text-center text-gray-500">No income in this period.</div>
            ) : (
              <>
                {/* Mobile: the thay cho bang, khong cuon ngang */}
                <ul className="md:hidden divide-y">
                  {data.orders.map(o => (
                    <li key={o.id} className="p-3 space-y-1 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/seller/orders/${o.id}`} className="text-blue-600 font-medium truncate">
                          #{o.order_number || o.id}
                        </Link>
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CLASS[o.status] || ''}`}>
                          {o.status}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-gray-600">
                        <span>Gross {formatUsd(o.gross)}</span>
                        <span>Fee -{formatUsd(o.fee)}</span>
                        <span className="font-semibold text-gray-900">{formatUsd(o.net)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="text-left p-2">Order</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-right p-2">Gross</th>
                        <th className="text-right p-2">Fee</th>
                        <th className="text-right p-2">Net</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map(o => (
                        <tr key={o.id} className="border-t">
                          <td className="p-2">
                            <Link to={`/seller/orders/${o.id}`} className="text-blue-600 hover:underline">
                              #{o.order_number || o.id}
                            </Link>
                          </td>
                          <td className="p-2">{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="p-2 text-right">{formatUsd(o.gross)}</td>
                          <td className="p-2 text-right text-red-600">-{formatUsd(o.fee)}</td>
                          <td className="p-2 text-right font-semibold">{formatUsd(o.net)}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CLASS[o.status] || ''}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="px-3 py-2 border-t text-xs text-gray-500">
              Showing the latest 50 orders. Pending orders are paid out once delivered; per-order fees
              are rounded individually.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
