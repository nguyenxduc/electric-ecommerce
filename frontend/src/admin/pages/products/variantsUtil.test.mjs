// Kiem tra logic sinh ma tran bien the. Chay: node src/admin/pages/products/variantsUtil.test.mjs
// (Node >= 22.18 tu bo kieu TypeScript; hook ben duoi them duoi .ts cho import khong co duoi.)
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) {
      const url = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(url))) return next(url.href, context)
    }
    return next(specifier, context)
  }
})

const { generateVariants, optionsFromRows, variantsToPayload } = await import('./variantsUtil.ts')

const options = [
  { name: 'Color', values: ['Black', 'White', 'black', ''] },
  { name: 'Storage', values: ['256GB', '512GB'] }
]

test('cartesian product with names, attributes and SKU suggestion', () => {
  const rows = generateVariants(options, [], 'iPhone 15 Đen')
  assert.deepEqual(
    rows.map(r => r.name),
    ['Black / 256GB', 'Black / 512GB', 'White / 256GB', 'White / 512GB']
  )
  assert.equal(rows[0].attrs, 'color=Black, storage=256GB')
  assert.equal(rows[0].sku, 'IPHONE-15-DEN-BLACK-256GB')
  assert.deepEqual(variantsToPayload(rows)[3].attributes, { color: 'White', storage: '512GB' })
})

test('existing matching rows are preserved, unmatched rows dropped', () => {
  const kept = {
    id: 7,
    sku: 'MY-SKU',
    name: 'Custom name',
    attrs: 'storage=512gb, Color=WHITE',
    price_delta: 100,
    quantity: 3
  }
  const gone = { id: 8, sku: 'OLD', name: 'Red', attrs: 'color=Red', price_delta: 0, quantity: 1 }
  const rows = generateVariants(options, [kept, gone])
  assert.equal(rows.length, 4)
  assert.equal(rows[3], kept)
  assert.ok(!rows.includes(gone))
  assert.equal(rows[0].id, undefined)
})

test('no usable options leaves rows untouched; options round-trip from rows', () => {
  const existing = generateVariants(options, [])
  assert.equal(generateVariants([{ name: ' ', values: ['x'] }], existing), existing)
  assert.deepEqual(optionsFromRows(existing), [
    { name: 'color', values: ['Black', 'White'] },
    { name: 'storage', values: ['256GB', '512GB'] }
  ])
  // Dau phay/"=" trong gia tri khong pha chuoi attrs
  const [row] = generateVariants([{ name: 'Size', values: ['10,5=x'] }], [])
  assert.deepEqual(variantsToPayload([row])[0].attributes, { size: '10 5 x' })
})

test('generated SKUs are unique even when values slugify the same', () => {
  const rows = generateVariants([{ name: 'Size', values: ['+', '++'] }], [], 'Phone')
  const skus = rows.map(r => r.sku)
  assert.equal(new Set(skus).size, skus.length, JSON.stringify(skus))
})

test('duplicate existing rows: the first one is kept', () => {
  const a = { sku: 'A', name: 'Black', attrs: 'color=Black', price_delta: '1', quantity: '5', id: 1 }
  const b = { sku: 'B', name: 'Black', attrs: 'color=Black', price_delta: '2', quantity: '9', id: 2 }
  const rows = generateVariants([{ name: 'Color', values: ['Black'] }], [a, b], 'X')
  assert.equal(rows[0].sku, 'A')
})
