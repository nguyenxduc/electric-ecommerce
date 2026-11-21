import type { ProductVariant } from '../../types'
import { slugifyName } from '../../../client/utils/productSlug'

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

// "color=Red, storage=128GB" -> { color: 'Red', storage: '128GB' }
export const parseAttrs = (attrs: string) => {
  const attributes: Record<string, string> = {}
  attrs.split(',').forEach(p => {
    const [k, ...rest] = p.split('=')
    if (k.trim() && rest.length) attributes[k.trim()] = rest.join('=').trim()
  })
  return attributes
}

export const variantsToPayload = (rows: VariantRow[]) =>
  rows.map(r => {
    const attributes = parseAttrs(r.attrs)
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

// ---- Ma tran bien the: tuy chon (Color: Black, White) x (Storage: 256GB) ----
export type VariantOption = { name: string; values: string[] }

// Ten tuy chon -> khoa thuoc tinh: "Color" -> "color", "Screen size" -> "screen_size"
export const optionKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '_')
// Dau phay va "=" la ky tu phan cach trong chuoi attrs nen khong cho vao gia tri
export const cleanOptionValue = (v: string) => v.replace(/[,=]/g, ' ').replace(/\s+/g, ' ').trim()

const signature = (attrs: Record<string, string>) =>
  Object.entries(attrs)
    .map(([k, v]) => `${optionKey(k)}=${v.trim().toLowerCase()}`)
    .sort()
    .join('|')

// Tich Descartes cua cac tuy chon. Dong cu co cung bo thuoc tinh (khong phan biet
// hoa/thuong, thu tu) duoc giu nguyen ca id/SKU/gia/ton kho; dong khong con khop bi bo.
export const generateVariants = (
  options: VariantOption[],
  existing: VariantRow[],
  skuBase = ''
): VariantRow[] => {
  const opts = options
    .map(o => ({
      key: optionKey(o.name),
      // Bo trung khong phan biet hoa/thuong: "Black" va "black" la mot gia tri
      values: o.values
        .map(cleanOptionValue)
        .filter((v, i, a) => v && a.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i)
    }))
    .filter((o, i, a) => o.key && o.values.length && a.findIndex(x => x.key === o.key) === i)
  if (!opts.length) return existing
  const combos = opts.reduce<string[][]>(
    (acc, o) => acc.flatMap(c => o.values.map(v => [...c, v])),
    [[]]
  )
  const bySig = new Map(existing.map(r => [signature(parseAttrs(r.attrs)), r]))
  const code = (s: string) => slugifyName(s).toUpperCase()
  return combos.map(values => {
    const attrs = Object.fromEntries(opts.map((o, i) => [o.key, values[i]]))
    const found = bySig.get(signature(attrs))
    if (found) return found
    return {
      sku: [skuBase && code(skuBase).slice(0, 24), ...values.map(code)].filter(Boolean).join('-').slice(0, 64),
      name: values.join(' / '),
      attrs: Object.entries(attrs)
        .map(([k, v]) => `${k}=${v}`)
        .join(', '),
      price_delta: '',
      quantity: ''
    }
  })
}

// Dung lai tuy chon tu cac dong da co (khi sua san pham co san bien the)
export const optionsFromRows = (rows: VariantRow[]): VariantOption[] => {
  const map = new Map<string, string[]>()
  rows.forEach(r =>
    Object.entries(parseAttrs(r.attrs)).forEach(([k, v]) => {
      const list = map.get(k) ?? []
      if (v && !list.includes(v)) list.push(v)
      map.set(k, list)
    })
  )
  return [...map].map(([name, values]) => ({ name, values }))
}
