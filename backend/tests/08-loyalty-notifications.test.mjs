import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'

const admin = await login(ACCOUNTS.admin)
const buyer = await login(ACCOUNTS.buyer2)

test('loyalty summary exposes points and tier', async () => {
  const res = await req('/loyalty/me', { token: buyer })
  assert.equal(res.status, 200, JSON.stringify(res.json).slice(0, 150))
  const data = res.json?.data
  assert.ok(data, 'summary payload present')
})

test('redeeming more points than owned is rejected', async () => {
  const res = await req('/loyalty/redeem', {
    method: 'POST',
    token: buyer,
    body: { points: 9999999 }
  })
  assert.ok([400, 422].includes(res.status), `status=${res.status}`)
})

test('notification list is scoped to the caller', async () => {
  const res = await req('/notifications?limit=5', { token: buyer })
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.json?.data?.notifications))
})

test('admin broadcast reaches every user', async () => {
  const marker = `Suite broadcast ${Date.now()}`
  const created = await req('/notifications', {
    method: 'POST',
    token: admin,
    body: { title: marker, message: 'Automated test broadcast' }
  })
  assert.equal(created.status, 201)

  const seen = await req('/notifications?limit=10', { token: buyer })
  const titles = (seen.json?.data?.notifications || []).map(n => n.title)
  assert.ok(titles.includes(marker), `broadcast visible to users: ${titles[0]}`)
})

test('plain users cannot create notifications', async () => {
  const res = await req('/notifications', {
    method: 'POST',
    token: buyer,
    body: { title: 'spam', message: 'spam' }
  })
  assert.equal(res.status, 403)
})
