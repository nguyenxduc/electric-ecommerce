import { VariantRow, emptyVariant, variantsTotal } from './variantsUtil'

const GRID = 'grid-cols-2 md:grid-cols-[1fr_1fr_1.5fr_90px_80px_auto]'

export default function VariantsEditor({
  rows,
  onChange
}: {
  rows: VariantRow[]
  onChange: (rows: VariantRow[]) => void
}) {
  const set = (i: number, patch: Partial<VariantRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const cls = 'border rounded px-2 py-1 text-sm w-full'
  const lbl = 'md:hidden block text-xs text-gray-600 mb-0.5'
  const num = (v: string) => (v === '' ? '' : Number(v))
  return (
    <div className="bg-white rounded border p-4">
      <div className="font-semibold mb-1">Variants (SKU)</div>
      <p className="text-xs text-gray-500 mb-3">
        Attributes as key=value pairs separated by commas (e.g. color=Black,
        storage=256GB). Price delta is added to the base price (USD).
        {rows.length > 0 &&
          ` Total stock = sum of variants (${variantsTotal(rows)}).`}
      </p>
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
