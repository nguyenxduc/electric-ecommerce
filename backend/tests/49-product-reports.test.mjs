// Bao cao san pham: buyer bao cao -> hang doi admin -> bo qua / go san pham + bao nguoi bao cao.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'

const admin = await login(ACCOUNTS.admin)
const seller2 = await login(ACCOUNTS.seller2) // chu gadget-hub
const buyer = await login(ACCOUNTS.buyer)
const buyer2 = await login(ACCOUNTS.buyer2)
const p = await firstProductOf('gadget-hub', 'price-desc')
const pid = BigInt(p.id)

const report = (token, body, id = p.id) =>
  req(`/products/${id}/report`, { method: 'POST', token, body })
const list = (status = 'open') =>
  req(`/product-reports?status=${status}&limit=100`, { token: admin })
const row = async status =>
  (await list(status)).json.data.reports.find(r => r.product?.id === p.id)

const clean = async () => {
  await prisma.productReport.deleteMany({ where: { product_id: pid } })
  await prisma.product.update({
    where: { id: pid },
    data: { is_active: true, takedown_reason: null, taken_down_at: null }
  })
}
await clean()
after(async () => {
  await clean()
  await prisma.$disconnect()
})

test('validation, own product, auth', async () => {
  assert.equal((await report(undefined, { reason: 'counterfeit' })).status, 401)
  assert.equal((await report(buyer, { reason: 'bogus' })).status, 400)
  assert.equal((await report(buyer, {})).status, 400)
  assert.equal((await report(buyer, { reason: 'other' })).status, 400, 'other needs detail')
  assert.equal((await report(buyer, { reason: 'other', detail: 'x'.repeat(501) })).status, 400)
  assert.equal((await report(seller2, { reason: 'counterfeit' })).status, 400, 'own product')
  assert.equal((await report(buyer, { reason: 'counterfeit' }, 999999999)).status, 404)
})

test('duplicate report -> 409 ALREADY_REPORTED', async () => {
  assert.equal((await report(buyer, { reason: 'counterfeit', detail: 'fake logo' })).status, 200)
  const dup = await report(buyer, { reason: 'offensive' })
  assert.equal(dup.status, 409)
  assert.equal(dup.json.code, 'ALREADY_REPORTED')
})

test('admin list groups by product; non-admin 403', async () => {
  assert.equal((await report(buyer2, { reason: 'other', detail: 'weird listing' })).status, 200)
  assert.equal((await req('/product-reports', { token: buyer })).status, 403)
  assert.equal((await req('/product-reports?status=nope', { token: admin })).status, 400)
  const r = await row('open')
  assert.equal(r.count, 2)
  assert.equal(r.reasons.counterfeit, 1)
  assert.equal(r.reasons.other, 1)
  assert.equal(r.product.taken_down_at, null)
  const todo = await req('/dashboard/todo', { token: admin })
  assert.ok(todo.json.data.reports_open >= 2)
})

test('dismiss closes open reports without notifying', async () => {
  assert.equal((await req(`/product-reports/${p.id}/dismiss`, { method: 'POST', token: buyer })).status, 403)
  const before = await prisma.notification.count({ where: { title: 'Report resolved' } })
  assert.equal((await req(`/product-reports/${p.id}/dismiss`, { method: 'POST', token: admin })).status, 200)
  assert.equal(await row('open'), undefined)
  assert.equal((await row('dismissed')).count, 2)
  assert.equal(await prisma.notification.count({ where: { title: 'Report resolved' } }), before)
  assert.equal((await req(`/product-reports/${p.id}/dismiss`, { method: 'POST', token: admin })).status, 404)
})

test('resolve takes the product down and thanks the reporter', async () => {
  await prisma.productReport.deleteMany({ where: { product_id: pid } })
  assert.equal((await report(buyer, { reason: 'prohibited' })).status, 200)
  const bad = await req(`/product-reports/${p.id}/resolve`, { method: 'POST', token: admin, body: { reason: 'no' } })
  assert.equal(bad.status, 400)
  const ok = await req(`/product-reports/${p.id}/resolve`, { method: 'POST', token: admin, body: { reason: 'Prohibited item' } })
  assert.equal(ok.status, 200)
  assert.equal(ok.json.data.resolved, 1)
  assert.equal((await req(`/products/${p.id}`)).status, 404, 'product hidden from buyers')
  assert.equal((await row('resolved')).product.taken_down_at != null, true)
  const notes = (await req('/notifications?type=SYSTEM&limit=20', { token: buyer })).json.data.notifications
  assert.ok(notes.some(n => n.title === 'Report resolved'))
  const restore = await req(`/products/${p.id}/restore`, { method: 'PATCH', token: admin })
  assert.equal(restore.status, 200)
})
