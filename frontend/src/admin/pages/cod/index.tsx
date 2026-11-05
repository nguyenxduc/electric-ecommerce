import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import SkeletonTable from '../../components/common/SkeletonTable'
import {
  createCodSettlement,
  errMsg,
  fetchCodPending,
  fetchCodSettlements,
  fmtVnd
} from '../../services/opsService'

const CARRIERS = ['', 'ghn', 'ghtk', 'mock']
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : '-')
const diffCls = (d: number) => (d !== 0 ? 'text-red-600 font-semibold' : 'text-green-600')

export default function AdminCodPage() {
  const qc = useQueryClient()
  const [carrier, setCarrier] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [received, setReceived] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState<any>(null)

  const pending = useQuery({
    queryKey: ['admin', 'cod', 'pending', carrier],
    queryFn: () => fetchCodPending(carrier)
  })
  const history = useQuery({
    queryKey: ['admin', 'cod', 'settlements', carrier],
    queryFn: () => fetchCodSettlements(carrier)
  })
  const rows: any[] = pending.data?.shipments ?? []
  const picked = rows.filter(r => selected.includes(r.id))
  const total = picked.reduce((s, r) => s + Number(r.cod_amount_vnd || 0), 0)
  const oneCarrier = new Set(picked.map(p => p.carrier)).size <= 1

  const settle = useMutation({
    mutationFn: () =>
      createCodSettlement({
        carrier: picked[0].carrier,
        shipment_ids: selected,
        received_amount_vnd: Number(received),
        reference: reference || undefined,
        note: note || undefined
      }),
    onSuccess: data => {
      setResult(data)
      setSelected([])
      setReceived('')
      setReference('')
      setNote('')
      qc.invalidateQueries({ queryKey: ['admin', 'cod'] })
      toast.success('Settlement recorded')
    },
    onError: e => toast.error(errMsg(e, 'Failed to record settlement'))
  })

  const toggle = (id: number) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const canSubmit = picked.length > 0 && received !== '' && Number(received) >= 0 && oneCarrier

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">COD Reconciliation</h1>
        <select
          value={carrier}
          onChange={e => {
            setCarrier(e.target.value)
            setSelected([])
          }}
          className="border rounded px-3 py-2 text-sm"
        >
          {CARRIERS.map(c => (
            <option key={c} value={c}>
              {c ? c.toUpperCase() : 'All carriers'}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <div className="p-3 border-b font-medium">
          Pending collected COD ({pending.data?.count ?? 0} shipments, {fmtVnd(pending.data?.total_cod_vnd)})
        </div>
        {pending.isLoading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3 w-8" />
                <th className="p-3">Tracking code</th>
                <th className="p-3">Carrier</th>
                <th className="p-3">Order</th>
                <th className="p-3 text-right">COD amount</th>
                <th className="p-3">Collected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="p-3 font-mono">{r.tracking_code}</td>
                  <td className="p-3 uppercase">{r.carrier}</td>
                  <td className="p-3">{r.order?.order_number ?? r.order_number ?? r.order_id}</td>
                  <td className="p-3 text-right">{fmtVnd(r.cod_amount_vnd)}</td>
                  <td className="p-3">{fmtDate(r.cod_collected_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No pending COD shipments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          settle.mutate()
        }}
        className="bg-white border rounded-lg p-4 space-y-3"
      >
        <div className="text-sm">
          Selected: <b>{picked.length}</b> shipments, expected <b>{fmtVnd(total)}</b>
          {!oneCarrier && <span className="text-red-600 ml-2">Select shipments from one carrier only</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="number"
            min={0}
            placeholder="Received amount (VND)"
            value={received}
            onChange={e => setReceived(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Reference"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Note"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          disabled={!canSubmit || settle.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          Record settlement
        </button>
        {result && (
          <div className="text-sm border rounded p-3 bg-gray-50">
            Settlement #{result.id}: expected {fmtVnd(result.expected_amount_vnd)}, received{' '}
            {fmtVnd(result.received_amount_vnd)}, difference{' '}
            <span className={diffCls(Number(result.difference_vnd))}>{fmtVnd(result.difference_vnd)}</span>
          </div>
        )}
      </form>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <div className="p-3 border-b font-medium">Settlement history</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Carrier</th>
              <th className="p-3">Reference</th>
              <th className="p-3">Shipments</th>
              <th className="p-3 text-right">Expected</th>
              <th className="p-3 text-right">Received</th>
              <th className="p-3 text-right">Difference</th>
              <th className="p-3">Note</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(history.data ?? []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.id}</td>
                <td className="p-3 uppercase">{s.carrier}</td>
                <td className="p-3">{s.reference || '-'}</td>
                <td className="p-3">{s._count?.shipments ?? '-'}</td>
                <td className="p-3 text-right">{fmtVnd(s.expected_amount_vnd)}</td>
                <td className="p-3 text-right">{fmtVnd(s.received_amount_vnd)}</td>
                <td className={`p-3 text-right ${diffCls(Number(s.difference_vnd))}`}>{fmtVnd(s.difference_vnd)}</td>
                <td className="p-3">{s.note || '-'}</td>
                <td className="p-3">{fmtDate(s.created_at)}</td>
              </tr>
            ))}
            {!history.isLoading && (history.data ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  No settlements yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
