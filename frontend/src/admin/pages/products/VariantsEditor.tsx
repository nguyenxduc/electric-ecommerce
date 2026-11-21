import { useState } from 'react'
import {
  VariantOption,
  VariantRow,
  cleanOptionValue,
  emptyVariant,
  generateVariants,
  optionsFromRows,
  variantsTotal
} from './variantsUtil'

const GRID = 'grid-cols-2 md:grid-cols-[1fr_1fr_1.5fr_90px_80px_auto]'

export default function VariantsEditor({
  rows,
  onChange,
  skuBase = ''
}: {
  rows: VariantRow[]
  onChange: (rows: VariantRow[]) => void
  // Tien to goi y SKU (thuong la ten san pham); SKU la duy nhat toan san
  skuBase?: string
}) {
  const [options, setOptions] = useState<VariantOption[]>(() => optionsFromRows(rows))
  // Trang sua tai bien the sau khi mount: lay tuy chon tu cac dong mot lan
  const [seeded, setSeeded] = useState(rows.length > 0)
  if (!seeded && rows.length > 0) {
    setSeeded(true)
    // Nguoi dung da tu khai bao tuy chon (vd. vua bam Generate) thi giu nguyen
    if (!options.length) setOptions(optionsFromRows(rows))
  }
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkQty, setBulkQty] = useState('')
  const setOption = (i: number, patch: Partial<VariantOption>) =>
    setOptions(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))
  const addValue = (i: number) => {
    const v = cleanOptionValue(drafts[i] || '')
    if (v && !options[i].values.some(x => x.toLowerCase() === v.toLowerCase())) {
      setOption(i, { values: [...options[i].values, v] })
    }
    setDrafts({ ...drafts, [i]: '' })
  }
  const generate = () => {
    const next = generateVariants(options, rows, skuBase)
    const dropped = rows.filter(r => !next.includes(r)).length
    if (
      dropped &&
      !window.confirm(`${dropped} existing variant(s) do not match the options and will be removed. Continue?`)
    )
      return
    onChange(next)
  }
  const applyAll = () =>
    onChange(
      rows.map(r => ({
        ...r,
        ...(bulkPrice !== '' && { price_delta: Number(bulkPrice) }),
        ...(bulkQty !== '' && { quantity: Number(bulkQty) })
      }))
    )
  const set = (i: number, patch: Partial<VariantRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const cls = 'border rounded px-2 py-1 text-sm w-full'
  const lbl = 'md:hidden block text-xs text-gray-600 mb-0.5'
  const num = (v: string) => (v === '' ? '' : Number(v))
  return (
    <div className="bg-white rounded border p-4">
      <div className="font-semibold mb-1">Variants (SKU)</div>
      <p className="text-xs text-gray-500 mb-3">
        Add options (e.g. Color: Black, White) and generate every combination,
        or add rows manually with attributes as key=value pairs (color=Black,
        storage=256GB). Price delta is added to the base price (USD).
        {rows.length > 0 &&
          ` Total stock = sum of variants (${variantsTotal(rows)}).`}
      </p>
      <div className="mb-4 rounded border border-dashed p-3 space-y-3">
        <div className="text-sm font-medium">Options</div>
        {options.map((o, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2">
            <input
              className={`${cls} sm:w-36 shrink-0`}
              placeholder="Option (e.g. Color)"
              aria-label={`Option ${i + 1} name`}
              value={o.name}
              onChange={e => setOption(i, { name: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
              {o.values.map(v => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs">
                  {v}
                  <button
                    type="button"
                    aria-label={`Remove ${v}`}
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => setOption(i, { values: o.values.filter(x => x !== v) })}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="border rounded px-2 py-0.5 text-xs w-32"
                placeholder="Add value + Enter"
                aria-label={`Option ${i + 1} values`}
                value={drafts[i] || ''}
                onChange={e => setDrafts({ ...drafts, [i]: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addValue(i)
                  }
                }}
                onBlur={() => addValue(i)}
              />
            </div>
            <button
              type="button"
              className="self-start px-2 py-1 border rounded text-xs"
              onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
            >
              Remove option
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {options.length < 3 && (
            <button
              type="button"
              className="px-2 py-1 border rounded text-sm"
              onClick={() => setOptions([...options, { name: '', values: [] }])}
            >
              + Add option
            </button>
          )}
          <button
            type="button"
            className="px-2 py-1 rounded text-sm bg-blue-600 text-white disabled:opacity-50"
            disabled={!options.some(o => o.name.trim() && o.values.length)}
            onClick={generate}
          >
            Generate variants
          </button>
        </div>
      </div>
      {rows.length > 1 && (
        <div className="mb-3 flex flex-wrap items-end gap-2 text-sm">
          <label>
            <span className="block text-xs text-gray-600 mb-0.5">Price +/- for all</span>
            <input type="number" className={`${cls} w-28`} value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} />
          </label>
          <label>
            <span className="block text-xs text-gray-600 mb-0.5">Qty for all</span>
            <input type="number" min={0} className={`${cls} w-24`} value={bulkQty} onChange={e => setBulkQty(e.target.value)} />
          </label>
          <button
            type="button"
            className="px-2 py-1 border rounded disabled:opacity-50"
            disabled={bulkPrice === '' && bulkQty === ''}
            onClick={applyAll}
          >
            Apply to all
          </button>
        </div>
      )}
      <div className={`hidden md:grid ${GRID} gap-2 text-xs font-medium text-gray-600 mb-1`}>
        <span>SKU</span>
        <span>Name</span>
        <span>Attributes</span>
        <span>Price +/-</span>
        <span>Qty</span>
        <span />
      </div>
      <div className="space-y-3 md:space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`grid ${GRID} gap-2 items-end md:items-center`}
          >
            <label className="min-w-0">
              <span className={lbl}>SKU</span>
              <input
                className={cls}
                placeholder="SKU"
                value={r.sku}
                onChange={e => set(i, { sku: e.target.value })}
              />
            </label>
            <label className="min-w-0">
              <span className={lbl}>Name</span>
              <input
                className={cls}
                placeholder="Name"
                value={r.name}
                onChange={e => set(i, { name: e.target.value })}
              />
            </label>
            <label className="min-w-0">
              <span className={lbl}>Attributes</span>
              <input
                className={cls}
                placeholder="color=Black, storage=256GB"
                value={r.attrs}
                onChange={e => set(i, { attrs: e.target.value })}
              />
            </label>
            <label className="min-w-0">
              <span className={lbl}>Price +/-</span>
              <input
                type="number"
                className={cls}
                placeholder="Price +/-"
                value={r.price_delta}
                onChange={e => set(i, { price_delta: num(e.target.value) })}
              />
            </label>
            <label className="min-w-0">
              <span className={lbl}>Qty</span>
              <input
                type="number"
                min={0}
                className={cls}
                placeholder="Qty"
                value={r.quantity}
                onChange={e => set(i, { quantity: num(e.target.value) })}
              />
            </label>
            <button
              type="button"
              className="px-2 py-1 border rounded text-sm"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 px-2 py-1 border rounded text-sm"
        onClick={() => onChange([...rows, emptyVariant()])}
      >
        + Add variant
      </button>
    </div>
  )
}
