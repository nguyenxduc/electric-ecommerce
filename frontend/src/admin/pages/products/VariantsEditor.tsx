export type VariantRow = {
  id?: number
  sku: string
  name: string
  attrs: string // "color=Red, storage=128GB"
  price_delta: number | ''
  quantity: number | ''
}

export const emptyVariant = (): VariantRow => ({
  sku: '',
  name: '',
  attrs: '',
  price_delta: '',
  quantity: ''
})

export const variantsFromProduct = (list: any): VariantRow[] =>
  (Array.isArray(list) ? list : []).map((v: any) => ({
    id: v.id,
    sku: v.sku || '',
    name: v.name || '',
    attrs: Object.entries(v.attributes || {})
      .map(([k, val]) => `${k}=${val}`)
      .join(', '),
    price_delta: Number(v.price_delta || 0),
    quantity: Number(v.quantity || 0)
  }))

export const variantsToPayload = (rows: VariantRow[]) =>
  rows.map(r => {
    const attributes: Record<string, string> = {}
    r.attrs.split(',').forEach(p => {
      const [k, ...rest] = p.split('=')
      if (k.trim() && rest.length) attributes[k.trim()] = rest.join('=').trim()
    })
    return {
      ...(r.id ? { id: r.id } : {}),
      sku: r.sku.trim(),
      name: r.name.trim(),
      attributes,
      price_delta: Number(r.price_delta || 0),
      quantity: Number(r.quantity || 0)
    }
  })

export const variantsTotal = (rows: VariantRow[]) =>
  rows.reduce((s, r) => s + Number(r.quantity || 0), 0)

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
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1.5fr_90px_80px_auto] gap-2 items-center"
          >
            <input
              className={cls}
              placeholder="SKU"
              value={r.sku}
              onChange={e => set(i, { sku: e.target.value })}
            />
            <input
              className={cls}
              placeholder="Name"
              value={r.name}
              onChange={e => set(i, { name: e.target.value })}
            />
            <input
              className={cls}
              placeholder="color=Black, storage=256GB"
              value={r.attrs}
              onChange={e => set(i, { attrs: e.target.value })}
            />
            <input
              type="number"
              className={cls}
              placeholder="Price +/-"
              value={r.price_delta}
              onChange={e => set(i, { price_delta: num(e.target.value) })}
            />
            <input
              type="number"
              min={0}
              className={cls}
              placeholder="Qty"
              value={r.quantity}
              onChange={e => set(i, { quantity: num(e.target.value) })}
            />
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
