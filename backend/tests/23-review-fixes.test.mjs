// Hoi quy cho cac loi review tim ra sau dot tinh nang van chuyen/SKU:
// gia/so luong am o checkout, huy don khi van don con song, giao don online
// chua tra tien.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const buyer = await login(ACCOUNTS.buyer)
const seller = await login(ACCOUNTS.seller1)
// Mon re: don COD gia tri cao tu tai khoan vua seed (<24h) cong diem gian
// lan, chay rieng file nay co the cham nguong chan va lam test sai muc dich.
const product = await firstProductOf('tech-world', 'price-asc')
const detail = (await req(`/products/${product.id}`)).json
const colors = (detail?.data ?? detail)?.available_colors ?? []
const item = (quantity = 1) => ({
  product_id: product.id,
  quantity,
  ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } })
})
const address = { name: 'Review Fix', phone: '0912345678', address: '1 Test St' }
const placeOrder = (items, payment_method = 'cod') =>
  req('/orders', { method: 'POST', token: buyer, body: { items, shipping_address: address, payment_method } })

const cleanup = []
after(async () => {
  for (const fn of cleanup.reverse()) await fn().catch(() => {})
})

test('checkout tu choi so luong am hoac le', async () => {
  for (const q of [-3, 0, 1.5]) {
    const r = await placeOrder([item(q)])
    assert.equal(r.status, 400, `quantity ${q}: ${JSON.stringify(r.json)}`)
  }
})

test('seller khong dat duoc bien the lam gia ban <= 0', async () => {
  const r = await req(`/products/${product.id}`, {
    method: 'PATCH',
    token: seller,
    body: { variants: [{ sku: `NEG-${Date.now()}`, name: 'Free', price_delta: -1e7, quantity: 5 }] }
  })
  assert.equal(r.status, 400, JSON.stringify(r.json))
  const after = (await req(`/products/${product.id}`)).json
  assert.equal(((after?.data ?? after)?.variants ?? []).length, 0)
})

test('khong huy duoc don khi van don con song; huy van don truoc thi duoc', async () => {
  const created = await placeOrder([item()])
  assert.equal(created.status, 201, JSON.stringify(created.json))
  const orderId = created.json.orders[0].id

  const ship = await req(`/shipments/orders/${orderId}`, { method: 'POST', token: seller })
  assert.equal(ship.status, 201, JSON.stringify(ship.json))

  const blocked = await req(`/orders/${orderId}/cancel`, { method: 'PATCH', token: buyer })
  assert.equal(blocked.status, 409, JSON.stringify(blocked.json))

  const cancelShip = await req(`/shipments/${ship.json.data.id}`, { method: 'DELETE', token: seller })
  assert.equal(cancelShip.status, 200, JSON.stringify(cancelShip.json))

  const ok = await req(`/orders/${orderId}/cancel`, { method: 'PATCH', token: buyer })
  assert.equal(ok.status, 200, JSON.stringify(ok.json))
})

test('khong tao van don cho don online chua thanh toan', async () => {
  const created = await placeOrder([item()], 'momo')
  assert.equal(created.status, 201, JSON.stringify(created.json))
  const orderId = created.json.orders[0].id
  cleanup.push(() => req(`/orders/${orderId}/cancel`, { method: 'PATCH', token: buyer }))

  const ship = await req(`/shipments/orders/${orderId}`, { method: 'POST', token: seller })
  assert.equal(ship.status, 400, JSON.stringify(ship.json))
})
