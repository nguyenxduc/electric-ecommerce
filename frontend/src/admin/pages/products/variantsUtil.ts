import { ProductVariant } from '../../types'

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

export const variantsFromProduct = (list: unknown): VariantRow[] =>
  (Array.isArray(list) ? list : []).map((v: ProductVariant) => ({
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
