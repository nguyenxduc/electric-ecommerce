// Cong cu seller: xac nhan hang loat, xuat CSV, trang thu nhap (finance).
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { API, req, login, ACCOUNTS, noVariants, round2 } from './helpers.mjs'
import { prisma } from '../lib/db.js'

after(() => prisma.$disconnect())

const jane = await login(ACCOUNTS.buyer)
const seller1 = await login(ACCOUNTS.seller1) // Tech World
// Test dat nhieu don: chon san pham con nhieu hang nhat de chay lai khong het kho
const stocked = async slug => {
  const res = await req(`/shops/${slug}/products?limit=50`)
  return res.json.products.filter(noVariants).sort((a, b) => b.quantity - a.quantity)[0]
}
const twP = await stocked('tech-world')
const ghP = await stocked('gadget-hub')

const placeOrder = async (product, payment_method, name = 'Jane Smith') => {
  const res = await req('/orders', {
    method: 'POST',
    token: jane,
    body: {
      items: [{ product_id: product.id, quantity: 1, color: product.available_colors?.[0] || null }],
      shipping_address: { name, phone: '0912345678', address: '1 Tools St' },
      payment_method
    }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json).slice(0, 200))
  return String(res.json.orders[0].id)
}

const statusOf = async id =>
  (await prisma.order.findUnique({ where: { id: BigInt(id) } })).status

test('bulk-status confirms own pending COD orders and skips the rest', async () => {
  const cod1 = await placeOrder(twP, 'cod')
  const cod2 = await placeOrder(twP, 'cod')
  const momo = await placeOrder(twP, 'momo') // chua tra tien
  const foreign = await placeOrder(ghP, 'cod') // don cua Gadget Hub
  const done = await placeOrder(twP, 'cod')
  await req(`/orders/${done}/update_status`, {
    method: 'PATCH',
    token: seller1,
    body: { status: 'processing' }
  })

  const res = await req('/orders/shop/bulk-status', {
    method: 'POST',
    token: seller1,
    body: { order_ids: [cod1, cod2, momo, foreign, done], status: 'processing' }
  })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.deepEqual(res.json.updated.sort(), [cod1, cod2].sort())
  const skipped = Object.fromEntries(res.json.skipped.map(s => [s.id, s.reason]))
  assert.match(skipped[momo], /not been paid/)
  assert.match(skipped[foreign], /not found/i)
  assert.match(skipped[done], /Cannot change/)

  assert.equal(await statusOf(cod1), 'processing')
  assert.equal(await statusOf(cod2), 'processing')
  assert.equal(await statusOf(momo), 'pending')
  assert.equal(await statusOf(foreign), 'pending', 'other shop order untouched')
})

test('bulk-status validates input', async () => {
  const bad = [
    { order_ids: [], status: 'processing' },
    { order_ids: ['1'], status: 'delivered' },
    { order_ids: Array.from({ length: 101 }, (_, i) => String(i + 1)), status: 'processing' },
    { order_ids: ['abc'], status: 'processing' }
  ]
  for (const body of bad) {
    const res = await req('/orders/shop/bulk-status', { method: 'POST', token: seller1, body })
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80))
  }
})

test('export.csv returns own orders only and neutralises formulas', async () => {
  const evil = await placeOrder(twP, 'cod', '=HYPERLINK("http://x","a,b")')
  const foreign = await placeOrder(ghP, 'cod')
  const res = await fetch(`${API}/orders/shop/export.csv?limit=1`, {
    headers: { Authorization: `Bearer ${seller1}` }
  })
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/csv/)
  assert.match(res.headers.get('content-disposition'), /attachment; filename="orders-.*\.csv"/)
  const csv = await res.text()
  const lines = csv.replace(/^﻿/, '').split('\r\n')
  assert.equal(
    lines[0],
    '"order_number","date","buyer","phone","items","total","status","payment_method"'
  )

  const [evilOrder, foreignOrder] = await Promise.all(
    [evil, foreign].map(id => prisma.order.findUnique({ where: { id: BigInt(id) } }))
  )
  const row = lines.find(l => l.startsWith(`"${evilOrder.order_number}"`))
  assert.ok(row, 'new order is exported')
  // Ten bat dau bang "=" bi them ' phia truoc, dau ngoac kep duoc nhan doi
  assert.ok(row.includes(`"'=HYPERLINK(""http://x"",""a,b"")"`), row)
  assert.ok(!csv.includes(foreignOrder.order_number), 'other shop orders are not exported')

  // Bo loc q dung chung voi danh sach
  const filtered = await fetch(
    `${API}/orders/shop/export.csv?q=${encodeURIComponent(evilOrder.order_number)}`,
    { headers: { Authorization: `Bearer ${seller1}` } }
  )
  const body = (await filtered.text()).trim().split('\r\n')
  assert.equal(body.length, 2, 'header + one matching row')
})

test('finance totals equal own delivered orders minus platform fee', async () => {
  const id = await placeOrder(twP, 'cod')
  for (const status of ['processing', 'delivered']) {
    const r = await req(`/orders/${id}/update_status`, { method: 'PATCH', token: seller1, body: { status } })
    assert.equal(r.status, 200, JSON.stringify(r.json))
  }
  const order = await prisma.order.findUnique({ where: { id: BigInt(id) } })
  const shopId = order.shop_id

  const res = await req('/dashboard/shop/finance', { token: seller1 })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const d = res.json.data

  const sumOf = async status =>
    Number(
      (
        await prisma.order.aggregate({
          _sum: { total_amount: true },
          where: { shop_id: shopId, deleted_at: null, status }
        })
      )._sum.total_amount || 0
    )
  const released = await sumOf('delivered')
  const pending = await sumOf({ in: ['processing', 'shipped'] })
  assert.equal(d.released.amount, released)
  assert.equal(d.pending.amount, pending)
  // Cung ty le phi voi dashboard seller
  const dash = await req('/dashboard/shop/stats', { token: seller1 })
  assert.equal(d.rate, dash.json.data.commission.rate)
  assert.equal(d.fee, round2(released * d.rate))
  assert.equal(d.net, round2(released - d.fee))
  assert.ok(d.orders.some(o => String(o.id) === id && o.status === 'delivered'))

  // Loc ngay: hom nay co don vua giao, ngay xa trong qua khu thi rong
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
  const ranged = (await req(`/dashboard/shop/finance?from=${today}&to=${today}`, { token: seller1 })).json.data
  assert.ok(ranged.released.amount >= Number(order.total_amount))
  const empty = (await req('/dashboard/shop/finance?from=2000-01-01&to=2000-01-02', { token: seller1 })).json.data
  assert.equal(empty.released.amount, 0)
  assert.equal(empty.orders.length, 0)
})
