// Khoi "To-do" cua seller dashboard va admin dashboard: so viec can xu ly
// phai khop voi DB va chi dung vai tro moi xem duoc.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'
import { prisma } from '../lib/db.js'

after(() => prisma.$disconnect())

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const buyer = await login(ACCOUNTS.buyer)

test('seller to-do counts match the shop data', async () => {
  const res = await req('/dashboard/shop/todo', { token: seller1 })
  assert.equal(res.status, 200, JSON.stringify(res.json).slice(0, 150))
  const d = res.json.data
  for (const k of ['to_confirm', 'to_ship', 'shipping', 'returns_pending', 'unread_messages', 'low_stock']) {
    assert.equal(typeof d[k], 'number', k)
  }
  const shop = await prisma.shop.findFirst({ where: { slug: 'tech-world' } })
  const pending = await prisma.order.count({ where: { shop_id: shop.id, status: 'pending', deleted_at: null } })
  assert.equal(d.to_confirm, pending)
  const low = await prisma.product.count({ where: { shop_id: shop.id, deleted_at: null, quantity: { lte: 5 } } })
  assert.equal(d.low_stock, low)
})

test('admin to-do includes pending shop applications', async () => {
  const res = await req('/dashboard/todo', { token: admin })
  assert.equal(res.status, 200)
  const pending = await prisma.shop.count({ where: { status: 'pending', deleted_at: null } })
  assert.equal(res.json.data.shops_pending, pending)
  assert.equal(typeof res.json.data.unread_support, 'number')
  assert.equal(typeof res.json.data.fraud_open, 'number')
})

test('to-do endpoints are role-gated', async () => {
  assert.equal((await req('/dashboard/shop/todo', { token: buyer })).status, 403)
  assert.equal((await req('/dashboard/todo', { token: seller1 })).status, 403)
})
