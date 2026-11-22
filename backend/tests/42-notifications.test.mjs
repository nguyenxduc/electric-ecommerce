// Trung tam thong bao: link sau khi dat hang, loc theo tab, danh dau da doc.
import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const buyer = await login(ACCOUNTS.buyer2)
const seller = await login(ACCOUNTS.seller1) // Tech World
const other = await login(ACCOUNTS.buyer)

let order

test('placing an order notifies buyer and seller with deep links', async () => {
  const p = await firstProductOf('tech-world')
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [{ product_id: p.id, quantity: 1, color: p.available_colors?.[0] || null }],
      shipping_address: { name: 'John', phone: '099', address: 'Demo St' },
      payment_method: 'cod'
    }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json).slice(0, 200))
  order = res.json.orders[0]

  const mine = await req('/notifications?type=ORDER&limit=20', { token: buyer })
  const buyerLinks = mine.json.data.notifications.map(n => n.link)
  assert.ok(
    buyerLinks.includes(`/profile?tab=orders&order=${order.id}`),
    `buyer links: ${buyerLinks.join(' | ')}`
  )

  const shop = await req('/notifications?type=ORDER&limit=20', { token: seller })
  const sellerLinks = shop.json.data.notifications.map(n => n.link)
  assert.ok(sellerLinks.includes(`/seller/orders/${order.id}`), `seller links: ${sellerLinks.join(' | ')}`)
})

test('type filter only returns that tab and unread counts add up', async () => {
  const res = await req('/notifications?type=ORDER&limit=50', { token: buyer })
  assert.equal(res.status, 200)
  assert.ok(res.json.data.notifications.every(n => n.type === 'ORDER'))
  const u = res.json.data.unread
  assert.ok(u.ORDER >= 1)
  assert.equal(u.total, u.ORDER + u.PROMO + u.SYSTEM)

  const sys = await req('/notifications?type=SYSTEM&limit=50', { token: buyer })
  assert.ok(sys.json.data.notifications.every(n => n.type !== 'ORDER' && n.type !== 'PROMO'))
})

test("a user cannot mark another user's notifications", async () => {
  const mine = await req('/notifications?type=ORDER&unreadOnly=true&limit=5', { token: buyer })
  const ids = mine.json.data.notifications.filter(n => n.user_id !== null).map(n => n.id)
  assert.ok(ids.length > 0)
  const res = await req('/notifications/mark-read', { method: 'POST', token: other, body: { ids } })
  assert.equal(res.status, 200)
  assert.equal(res.json.data.updated, 0)
  const after = await req('/notifications?type=ORDER&unreadOnly=true&limit=5', { token: buyer })
  assert.equal(after.json.data.pagination.total, mine.json.data.pagination.total)
})

test('mark all as read zeroes the unread count', async () => {
  const res = await req('/notifications/mark-read', { method: 'POST', token: buyer, body: { all: true } })
  assert.equal(res.status, 200)
  const after = await req('/notifications?limit=1', { token: buyer })
  assert.equal(after.json.data.unread.total, 0)
})

test('mark-read without ids or all is rejected', async () => {
  const res = await req('/notifications/mark-read', { method: 'POST', token: buyer, body: {} })
  assert.equal(res.status, 400)
})

// Broadcast cua admin: moi nguoi doc rieng. Truoc day mot nguoi "mark all" la
// thong bao chung thanh da doc voi tat ca.
test('a broadcast is read per user', async () => {
  const admin = await login(ACCOUNTS.admin)
  const a = await login(ACCOUNTS.buyer)
  const b = await login(ACCOUNTS.buyer2)
  const title = `Broadcast ${Date.now()}`
  const sent = await req('/notifications', { method: 'POST', token: admin, body: { title, message: 'Hello all' } })
  assert.equal(sent.status, 201, JSON.stringify(sent.json))
  await req('/notifications/mark-read', { method: 'POST', token: a, body: { all: true } })
  const listB = (await req('/notifications?limit=50', { token: b })).json.data
  const mine = (listB.notifications || listB.items || []).find(n => n.title === title)
  assert.ok(mine, 'buyer2 received the broadcast')
  assert.equal(mine.is_read, false, 'still unread for buyer2')
})
