import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getMyInvoices,
  getMyTaxSummary,
  openInvoiceHtml
} from '../../services/sellerService'

const money = (v: number | string) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(v || 0))

export default function SellerTax() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [page, setPage] = useState(1)

  const { data: tax, isLoading: taxLoading } = useQuery({
    queryKey: ['seller-tax', year],
    queryFn: () => getMyTaxSummary(year)
  })
  const { data: inv, isLoading: invLoading } = useQuery({
    queryKey: ['seller-invoices', page],
    queryFn: () => getMyInvoices(page, 10)
  })

  const view = (id: number) =>
    openInvoiceHtml(id).catch(() => toast.error('Failed to open invoice'))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tax & Invoices</h1>
        <select
          className="border rounded px-2 py-1"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {[0, 1, 2, 3].map(i => (
            <option key={i} value={thisYear - i}>
              {thisYear - i}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded border overflow-x-auto">
        <div className="p-3 font-semibold">Monthly tax withheld ({year})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Period</th>
              <th className="text-right p-2">Orders</th>
              <th className="text-right p-2">Revenue base</th>
              <th className="text-right p-2">VAT</th>
              <th className="text-right p-2">PIT</th>
              <th className="text-right p-2">Total withheld</th>
            </tr>
          </thead>
          <tbody>
            {taxLoading && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            )}
            {tax?.months?.map(m => (
              <tr key={m.period} className="border-t">
                <td className="p-2">{m.period}</td>
                <td className="p-2 text-right">{m.orders}</td>
                <td className="p-2 text-right">{money(m.base)}</td>
                <td className="p-2 text-right">{money(m.vat)}</td>
                <td className="p-2 text-right">{money(m.pit)}</td>
                <td className="p-2 text-right font-medium">
                  {money(m.total_withheld)}
                </td>
              </tr>
            ))}
            {!taxLoading && !tax?.months?.length && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={6}>
                  No data for this year.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded border overflow-x-auto">
        <div className="p-3 font-semibold">Invoices</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Number</th>
              <th className="text-left p-2">Buyer</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Total</th>
              <th className="text-left p-2">Issued</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {invLoading && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            )}
            {inv?.invoices?.map(i => (
              <tr key={i.id} className="border-t">
                <td className="p-2">{i.invoice_number}</td>
                <td className="p-2">
                  {i.buyer?.company_name || i.buyer?.name || '—'}
                </td>
                <td className="p-2 capitalize">{i.status}</td>
                <td className="p-2 text-right">{money(i.total)}</td>
                <td className="p-2">
                  {new Date(i.issued_at).toLocaleDateString()}
                </td>
                <td className="p-2 text-right">
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => view(i.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {!invLoading && !inv?.invoices?.length && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={6}>
                  No invoices yet. They are issued when orders are delivered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {inv && inv.pagination.total_pages > 1 && (
          <div className="flex items-center justify-end gap-2 p-3 text-sm">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>
            <span>
              {page} / {inv.pagination.total_pages}
            </span>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              disabled={page >= inv.pagination.total_pages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
