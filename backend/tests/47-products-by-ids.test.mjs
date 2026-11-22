import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'

// GET /products/by-ids: giu thu tu yeu cau, id an/khong co bi bo, sai dinh dang -> 400.

const seller1 = await login(ACCOUNTS.seller1)
const list = (await req('/shops/tech-world/products?limit=10')).json.products
const [a, b, c] = list.map(p => p.id)
const byIds = ids => req(`/products/by-ids?ids=${ids}`)

test('giu dung thu tu yeu cau, bo id khong ton tai', async () => {
  const r = await byIds(`${c},999999999,${a},${b}`)
  assert.equal(r.status, 200)
  assert.deepEqual(r.json.products.map(p => p.id), [c, a, b])
  assert.ok('final_price' in r.json.products[0] || 'price' in r.json.products[0])
})

test('san pham bi an khoi nguoi mua', async () => {
  const hide = v => req(`/products/${b}/visibility`, { method: 'PATCH', token: seller1, body: { is_active: v } })
  assert.equal((await hide(false)).status, 200)
  try {
    assert.deepEqual((await byIds(`${a},${b},${c}`)).json.products.map(p => p.id), [a, c])
  } finally {
    await hide(true)
  }
})

test('qua 20 id, khong phai so, hoac rong -> 400', async () => {
  const many = Array.from({ length: 21 }, (_, i) => i + 1).join(',')
  assert.equal((await byIds(many)).status, 400)
  assert.equal((await byIds(`${a},abc`)).status, 400)
  assert.equal((await byIds('')).status, 400)
  assert.equal((await byIds(`${a},-1`)).status, 400)
})
