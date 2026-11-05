import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import SkeletonTable from '../../components/common/SkeletonTable'
import AdminPagination from '../../components/common/AdminPagination'
import { downloadTaxCsv, errMsg, fetchInvoices, fetchTaxReport, openInvoiceHtml } from '../../services/opsService'

const num = (n: any) => Number(n ?? 0).toLocaleString('en-US')
const inp = 'border rounded px-3 py-2 text-sm'

export default function AdminTaxPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [shopId, setShopId] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const report = useQuery({
    queryKey: ['admin', 'tax', period],
    queryFn: () => fetchTaxReport(period),
    enabled: /^\d{4}-\d{2}$/.test(period)
  })
  const invoices = useQuery({
    queryKey: ['admin', 'invoices', shopId, status, from, to, page],
    queryFn: () =>
      fetchInvoices({
        shop_id: shopId || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 10
      })
  })

  const rows: any[] = report.data?.rows ?? []
  const sum = (k: string) => rows.reduce((s, r) => s + Number(r[k] || 0), 0)
  const list: any[] = invoices.data?.invoices ?? []
  const pg = invoices.data?.pagination
  const run = (fn: () => Promise<unknown>, fail: string) => fn().catch(e => toast.error(errMsg(e, fail)))
  const filter =
    (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      set(e.target.value)
      setPage(1)
    }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tax &amp; Invoices</h1>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <div className="p-3 border-b flex items-center gap-3">
          <span className="font-medium">Tax report</span>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className={inp} />
          <button
            onClick={() => run(() => downloadTaxCsv(period), 'Failed to download CSV')}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Download CSV
          </button>
        </div>
        {report.isLoading ? (
          <SkeletonTable rows={4} cols={7} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Shop</th>
                <th className="p-3">Tax code</th>
                <th className="p-3">Entity</th>
                <th className="p-3 text-right">Orders</th>
                <th className="p-3 text-right">Base</th>
                <th className="p-3 text-right">VAT</th>
                <th className="p-3 text-right">PIT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.shop_id} className="border-t">
                  <td className="p-3">{r.shop_name}</td>
                  <td className="p-3">{r.tax_code || '-'}</td>
                  <td className="p-3">{r.entity_type || '-'}</td>
                  <td className="p-3 text-right">{num(r.orders)}</td>
                  <td className="p-3 text-right">{num(r.base)}</td>
                  <td className="p-3 text-right">{num(r.vat)}</td>
                  <td className="p-3 text-right">{num(r.pit)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No data for this period
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t bg-gray-50 font-semibold">
                <tr>
                  <td className="p-3" colSpan={3}>
                    Total
                  </td>
                  <td className="p-3 text-right">{num(sum('orders'))}</td>
                  <td className="p-3 text-right">{num(sum('base'))}</td>
                  <td className="p-3 text-right">{num(sum('vat'))}</td>
                  <td className="p-3 text-right">{num(sum('pit'))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <div className="p-3 border-b flex flex-wrap items-center gap-3">
          <span className="font-medium">Invoices</span>
          <input placeholder="Shop ID" value={shopId} onChange={filter(setShopId)} className={`${inp} w-28`} />
          <select value={status} onChange={filter(setStatus)} className={inp}>
            <option value="">All statuses</option>
            <option value="issued">issued</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input type="date" value={from} onChange={filter(setFrom)} className={inp} />
          <input type="date" value={to} onChange={filter(setTo)} className={inp} />
        </div>
        {invoices.isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Number</th>
                <th className="p-3">Seller</th>
                <th className="p-3">Buyer</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Issued</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {list.map(inv => (
                <tr key={inv.id} className="border-t">
                  <td className="p-3 font-mono">
                    {inv.invoice_number}
                  </td>
                  <td className="p-3">{inv.seller?.name}</td>
                  <td className="p-3">{inv.buyer?.company_name || inv.buyer?.name}</td>
                  <td className="p-3 text-right">{num(inv.total)}</td>
                  <td className="p-3">{inv.status}</td>
                  <td className="p-3">{new Date(inv.issued_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => run(() => openInvoiceHtml(inv.id), 'Failed to open invoice')}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No invoices
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {pg && (
          <AdminPagination
            page={page}
            totalPages={pg.total_pages ?? pg.pages ?? 1}
            totalItems={pg.total_count ?? pg.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
