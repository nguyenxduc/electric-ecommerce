// Gop request giong het dang chay (danh sach san pham): mot lan tinh, khong giu lai nhu cache,
// loi khong bi ket cho lan sau; endpoint van tra du lieu dung cho tung vai tro.
import test from 'node:test'
import assert from 'node:assert/strict'
import { singleFlight } from '../lib/singleFlight.js'
import { req, login, ACCOUNTS } from './helpers.mjs'

test('request song song dung chung mot lan tinh, xong thi xoa', async () => {
  let calls = 0
  const slow = () => new Promise(r => setTimeout(() => r(++calls), 30))
  const results = await Promise.all([1, 2, 3].map(() => singleFlight('k', slow)))
  assert.deepEqual(results, [1, 1, 1])
  assert.equal(await singleFlight('k', slow), 2, 'xong roi phai tinh lai, khong cache')
})

test('loi tra ve cho moi nguoi cho, lan sau tinh lai', async () => {
  await assert.rejects(singleFlight('e', async () => { throw new Error('boom') }), /boom/)
  assert.equal(await singleFlight('e', async () => 7), 7)
})

test('GET /products song song: cung ket qua, admin va buyer khong dung chung', async () => {
  const [a, b] = await Promise.all([req('/products?limit=5'), req('/products?limit=5')])
  assert.equal(a.status, 200)
  assert.deepEqual(a.json, b.json)

  const admin = await login(ACCOUNTS.admin)
  const [buyerView, adminView] = await Promise.all([
    req('/products?limit=50&status=hidden'),
    req('/products?limit=50&status=hidden', { token: admin })
  ])
  assert.ok(adminView.json.products.every(p => p.is_active === false), 'admin loc hang an')
  assert.ok(buyerView.json.products.every(p => p.is_active !== false), 'buyer khong thay hang an')
})
