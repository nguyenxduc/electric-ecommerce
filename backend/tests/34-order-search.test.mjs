// Tim don hang theo nguoi mua / sdt / ma van don / ten san pham, loc ngay va shop.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'

after(() => prisma.$disconnect())

const jane = await login(ACCOUNTS.buyer)
const seller1 = await login(ACCOUNTS.seller1) // Tech World
const admin = await login(ACCOUNTS.admin)
const twP = await firstProductOf('tech-world')
const PHONE = `09${String(Date.now()).slice(-8)}`

// Jane dat mot don COD o Tech World voi sdt rieng de tim lai
const placed = await req('/orders', {
  method: 'POST',
  token: jane,
  body: {
    items: [{ product_id: twP.id, quantity: 1, color: twP.available_colors?.[0] || null }],
    shipping_address: { name: 'Jane Smith', phone: PHONE, address: '1 Search St' },
    payment_method: 'cod'
  }
})
assert.equal(placed.status, 201, JSON.stringify(placed.json).slice(0, 200))
const orderId = String(placed.json.orders[0].id)
const shopId = String(placed.json.orders[0].shop_id)

test('seller search by buyer name finds only own-shop orders of that buyer', async () => {
  const res = await req('/orders/shop/mine?q=Jane&limit=50', { token: seller1 })
  assert.equal(res.status, 200)
  const orders = res.json.orders
  assert.ok(orders.some(o => String(o.id) === orderId), 'new order is found')
  for (const o of orders) {
    assert.equal(String(o.shop_id), shopId)
    assert.match(`${o.user?.name} ${o.receiver_name}`, /jane/i)
  }
})

test('seller search by product name and no-match', async () => {
  const hit = await req(`/orders/shop/mine?q=${encodeURIComponent(twP.name)}&limit=50`, { token: seller1 })
  assert.ok(hit.json.orders.some(o => String(o.id) === orderId))
  const miss = await req('/orders/shop/mine?q=zzz-no-such-order', { token: seller1 })
  assert.equal(miss.json.orders.length, 0)
})

test('admin search by receiver phone', async () => {
  const res = await req(`/orders?q=${PHONE}`, { token: admin })
  assert.equal(res.status, 200)
  assert.deepEqual(res.json.orders.map(o => String(o.id)), [orderId])
})

test('admin filters by shop and date range', async () => {
  // Server hieu YYYY-MM-DD theo gio Viet Nam: lay "hom nay" theo gio VN, khong theo UTC
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })
  const res = await req(`/orders?q=${PHONE}&shop_id=${shopId}&from=${today}&to=${today}`, { token: admin })
  assert.deepEqual(res.json.orders.map(o => String(o.id)), [orderId])
  const otherShop = await req(`/orders?q=${PHONE}&shop_id=999999`, { token: admin })
  assert.equal(otherShop.json.orders.length, 0)
  const past = await req(`/orders?q=${PHONE}&to=2000-01-01`, { token: admin })
  assert.equal(past.json.orders.length, 0)
})

test('seller cancel stores reason in audit log', async () => {
  const res = await req(`/orders/${orderId}/update_status`, {
    method: 'PATCH',
    token: seller1,
    body: { status: 'cancelled', reason: 'Out of stock' }
  })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  // Audit log ghi bat dong bo, cho mot chut
  let log = null
  for (let i = 0; i < 20 && !log?.metadata?.reason; i++) {
    log = await prisma.auditLog.findFirst({
      where: { action: 'ORDER_STATUS_UPDATE', resource: 'order', resource_id: BigInt(orderId) },
      orderBy: { created_at: 'desc' }
    })
    if (!log?.metadata?.reason) await new Promise(r => setTimeout(r, 100))
  }
  assert.equal(log?.metadata?.reason, 'Out of stock')
})
