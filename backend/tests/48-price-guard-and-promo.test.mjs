import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, round2 } from './helpers.mjs'

// Chan gia tang luc dat don (expected_total), loc discount=true gom ca flash sale,
// thong bao PROMO cho nguoi theo doi khi shop tao voucher.

const seller = await login(ACCOUNTS.seller1) // chu tech-world
const buyer = await login(ACCOUNTS.buyer2)
const SLUG = 'tech-world'
const HOUR = 3600 * 1000

const list = await req(`/shops/${SLUG}/products?limit=20`)
const p = (list.json?.products ?? [])
  .filter(x => !x.variants?.length && (x.quantity ?? 0) > 0)
  .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0]
assert.ok(p, 'tech-world khong co san pham dat duoc')
const pid = BigInt(p.id)
const original = await prisma.product.findUnique({
  where: { id: pid },
  select: { discount: true, flash_discount: true, flash_starts_at: true, flash_ends_at: true }
})
const detail = (await req(`/products/${p.id}`)).json
const color = (detail.available_colors ?? []).find(c => c.quantity > 0)
const item = {
  product_id: p.id,
  quantity: 1,
  ...(color && { color: { name: color.name, code: color.code } })
}
const stock = async () => (await prisma.product.findUnique({ where: { id: pid } })).quantity
const order = expected_total =>
  req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [item],
      shipping_address: { name: 'Guard Test', phone: '0900000048', address: 'HN' },
      payment_method: 'cod',
      ...(expected_total !== undefined && { expected_total })
    }
  })
const createdOrders = []
let couponId = null

const startedAt = new Date()

after(async () => {
  // PATCH flash trong test bao that cho follower cua shop: don thong bao do test tao
  await prisma.notification.deleteMany({ where: { type: 'PROMO', created_at: { gte: startedAt } } })
  for (const id of createdOrders) await req(`/orders/${id}/cancel`, { method: 'PATCH', token: buyer })
  await prisma.product.update({ where: { id: pid }, data: original })
  await req(`/shops/${SLUG}/follow`, { method: 'DELETE', token: buyer })
  if (couponId) await prisma.coupon.delete({ where: { id: couponId } })
  await prisma.$disconnect()
})

test('expected_total thap hon gia that -> 409 PRICE_CHANGED, khong tao don, ton kho giu nguyen', async () => {
  const actual = round2(Number(detail.final_price))
  const before = await stock()
  const ordersBefore = await prisma.order.count({ where: { order_items: { some: { product_id: pid } } } })
  const r = await order(round2(actual - 1))
  assert.equal(r.status, 409, JSON.stringify(r.json))
  assert.equal(r.json.code, 'PRICE_CHANGED')
  assert.equal(r.json.actual, actual)
  assert.equal(await stock(), before)
  assert.equal(await prisma.order.count({ where: { order_items: { some: { product_id: pid } } } }), ordersBefore)
})

test('expected_total khong phai so -> 400', async () => {
  assert.equal((await order('abc')).status, 400)
})

test('expected_total bang gia that -> 201; khong gui -> 201', async () => {
  const actual = round2(Number(detail.final_price))
  const a = await order(actual)
  assert.equal(a.status, 201, JSON.stringify(a.json))
  createdOrders.push(a.json.orders[0].id)
  const b = await order()
  assert.equal(b.status, 201, JSON.stringify(b.json))
  createdOrders.push(b.json.orders[0].id)
})

test('expected_total cao hon gia that (gia giam) -> van 201', async () => {
  const r = await order(round2(Number(detail.final_price) + 50))
  assert.equal(r.status, 201, JSON.stringify(r.json))
  createdOrders.push(r.json.orders[0].id)
})

test('discount=true gom san pham co flash sale dang chay du discount thuong = 0', async () => {
  await prisma.product.update({
    where: { id: pid },
    data: { discount: 0, flash_discount: null, flash_starts_at: null, flash_ends_at: null }
  })
  const q = `/products?discount=true&limit=100&shop_id=${p.shop_id ?? (await prisma.product.findUnique({ where: { id: pid } })).shop_id}`
  const has = async () =>
    (await req(q)).json.products.some(x => String(x.id) === String(pid))
  assert.equal(await has(), false)

  const price = Number(p.price)
  const set = await req(`/products/${pid}`, {
    method: 'PATCH',
    token: seller,
    body: {
      flash_discount: round2(price / 2),
      flash_starts_at: new Date(Date.now() - HOUR).toISOString(),
      flash_ends_at: new Date(Date.now() + HOUR).toISOString()
    }
  })
  assert.equal(set.status, 200, JSON.stringify(set.json))
  assert.equal(await has(), true)
})

test('shop tao voucher cong khai -> nguoi theo doi nhan thong bao PROMO', async () => {
  assert.equal((await req(`/shops/${SLUG}/follow`, { method: 'POST', token: buyer })).status, 200)
  const buyerRow = await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer2 } })
  const code = `PROMO48${Date.now() % 100000}`
  const r = await req('/coupons/shop', {
    method: 'POST',
    token: seller,
    body: { code, discount_type: 'percent', discount_value: 5 }
  })
  assert.equal(r.status, 201, JSON.stringify(r.json))
  couponId = BigInt(r.json.coupon.id)
  // fire-and-forget: cho ghi xong
  let n = null
  for (let i = 0; i < 20 && !n; i++) {
    n = await prisma.notification.findFirst({
      where: { user_id: buyerRow.id, type: 'PROMO', message: { contains: code } }
    })
    if (!n) await new Promise(res => setTimeout(res, 100))
  }
  assert.ok(n, 'khong co thong bao PROMO')
  assert.equal(n.link, `/shop/${SLUG}`)

  // Voucher thu hai trong 24h: khong bao lai (chong spam)
  const r2 = await req('/coupons/shop', {
    method: 'POST',
    token: seller,
    body: { code: code + 'B', discount_type: 'percent', discount_value: 5 }
  })
  assert.equal(r2.status, 201, JSON.stringify(r2.json))
  await new Promise(res => setTimeout(res, 500))
  const count = await prisma.notification.count({
    where: { user_id: buyerRow.id, type: 'PROMO', link: `/shop/${SLUG}` }
  })
  assert.equal(count, 1, 'voucher thu hai van bao lai nguoi theo doi')
  await prisma.coupon.delete({ where: { id: BigInt(r2.json.coupon.id) } })
  await prisma.notification.deleteMany({ where: { id: n.id } })
})
