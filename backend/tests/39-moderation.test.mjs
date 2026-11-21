// Kiem duyet cua san: admin go san pham vi pham (seller khong tu bat lai duoc)
// va khoa tai khoan (chan dang nhap + tu choi token dang dung).
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1) // Tech World
// Lay san pham dat nhat de khong dung hang voi cac bo test khac (thuong lay re nhat)
const p = await firstProductOf('tech-world', 'price-desc')
const buyer2Id = BigInt((await req('/auth/me', { token: await login(ACCOUNTS.buyer2) })).json.data.id)

const loginAs = email => req('/auth/login', { method: 'POST', body: { email, password: 'password123' } })

after(async () => {
  // Luon tra lai trang thai seed, ke ca khi test giua chung that bai
  await prisma.product.update({
    where: { id: BigInt(p.id) },
    data: { is_active: true, takedown_reason: null, taken_down_at: null }
  })
  await prisma.user.update({ where: { id: buyer2Id }, data: { suspended_at: null, suspend_reason: null } })
  await prisma.$disconnect()
})

test('admin takedown hides a product and the seller cannot re-enable it', async () => {
  const short = await req(`/products/${p.id}/takedown`, { method: 'PATCH', token: admin, body: { reason: 'bad' } })
  assert.equal(short.status, 400, 'reason must be >= 5 chars')

  const down = await req(`/products/${p.id}/takedown`, {
    method: 'PATCH',
    token: admin,
    body: { reason: 'Counterfeit item' }
  })
  assert.equal(down.status, 200, JSON.stringify(down.json))

  assert.equal((await req(`/products/${p.id}`)).status, 404, 'detail hidden from buyers')
  const list = await req(`/products?search=${encodeURIComponent(p.name)}&limit=50`)
  assert.ok(!(list.json.products || []).some(x => x.id === p.id), 'not in buyer list')

  const reEnable = await req(`/products/${p.id}/visibility`, {
    method: 'PATCH',
    token: seller1,
    body: { is_active: true }
  })
  assert.equal(reEnable.status, 403)
  assert.match(reEnable.json.message, /Counterfeit item/)

  const mine = await req(`/products/shop/mine?status=hidden&limit=100`, { token: seller1 })
  const row = (mine.json.products || []).find(x => x.id === p.id)
  assert.equal(row?.takedown_reason, 'Counterfeit item', 'seller sees the reason')

  const adminList = await req('/products?status=taken_down&limit=100', { token: admin })
  assert.ok(adminList.json.products.some(x => x.id === p.id), 'admin status filter')

  const todo = await req('/dashboard/todo', { token: admin })
  assert.ok(todo.json.data.products_taken_down >= 1, 'admin todo counts taken-down products')

  const restored = await req(`/products/${p.id}/restore`, { method: 'PATCH', token: admin })
  assert.equal(restored.status, 200)
  assert.equal((await req(`/products/${p.id}`)).status, 200, 'visible again')
})

test('non-admins cannot take down or restore products', async () => {
  for (const action of ['takedown', 'restore']) {
    const res = await req(`/products/${p.id}/${action}`, {
      method: 'PATCH',
      token: seller1,
      body: { reason: 'Prohibited item' }
    })
    assert.equal(res.status, 403)
  }
})

test('suspended user cannot log in and existing token is rejected', async () => {
  const before = (await loginAs(ACCOUNTS.buyer2)).json.data.accessToken
  assert.ok(before)

  const sus = await req(`/customers/${buyer2Id}/suspend`, {
    method: 'PATCH',
    token: admin,
    body: { reason: 'Payment fraud' }
  })
  assert.equal(sus.status, 200, JSON.stringify(sus.json))

  const blocked = await loginAs(ACCOUNTS.buyer2)
  assert.equal(blocked.status, 403)
  assert.match(blocked.json.error, /suspended/i)

  const me = await req('/auth/me', { token: before })
  assert.equal(me.status, 403)
  assert.equal(me.json.code, 'ACCOUNT_SUSPENDED')

  const listed = await req(`/customers?q=${encodeURIComponent(ACCOUNTS.buyer2)}&role=user`, { token: admin })
  assert.ok(listed.json.users.find(u => u.email === ACCOUNTS.buyer2)?.suspended_at)

  const un = await req(`/customers/${buyer2Id}/unsuspend`, { method: 'PATCH', token: admin })
  assert.equal(un.status, 200)
  assert.equal((await loginAs(ACCOUNTS.buyer2)).status, 200)
  assert.equal((await req('/auth/me', { token: before })).status, 200)
})

test('admins cannot be suspended', async () => {
  const adminId = (await req('/auth/me', { token: admin })).json.data.id
  const self = await req(`/customers/${adminId}/suspend`, {
    method: 'PATCH',
    token: admin,
    body: { reason: 'Testing self suspend' }
  })
  assert.equal(self.status, 400)

  // Admin thu hai tao tam, xoa ngay sau khi kiem tra
  const other = await prisma.user.create({
    data: { name: 'Temp Admin', email: `tmp-admin-${Date.now()}@example.com`, role: 'admin' },
    select: { id: true }
  })
  try {
    const res = await req(`/customers/${other.id}/suspend`, {
      method: 'PATCH',
      token: admin,
      body: { reason: 'Testing admin suspend' }
    })
    assert.equal(res.status, 403)
  } finally {
    await prisma.user.delete({ where: { id: other.id } })
  }
  const buyerToken = await login(ACCOUNTS.buyer)
  const byBuyer = await req(`/customers/${buyer2Id}/suspend`, {
    method: 'PATCH',
    token: buyerToken,
    body: { reason: 'Not allowed here' }
  })
  assert.equal(byBuyer.status, 403)
})
