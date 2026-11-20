// Prisma hieu object trong `where` la bo loc ({startsWith}, {not}...). Truong
// le ra la chuoi (email, ma coupon, ma reset) ma nhan object thi phai bi chan,
// neu khong co the dung coupon khong biet ma hoac do ma tung ky tu.
import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const buyer = await login(ACCOUNTS.buyer2)

test('coupon_code must be a string when placing an order', async () => {
  const p = await firstProductOf('gadget-hub')
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [{ product_id: p.id, quantity: 1, color: p.available_colors?.[0] || null }],
      shipping_address: { name: 'John', phone: '0912345678', address: 'Demo St' },
      payment_method: 'cod',
      coupon_code: { startsWith: '' }
    }
  })
  assert.equal(res.status, 400)
})

test('coupon validation rejects filter objects', async () => {
  const res = await req('/coupons/validate', {
    method: 'POST',
    token: buyer,
    body: { code: { not: '' }, amount: 500 }
  })
  assert.equal(res.status, 400)
})

test('auth endpoints reject non-string email', async () => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: { email: { contains: 'example.com' }, password: 'password123' }
  })
  assert.equal(res.status, 400)
  const reset = await req('/auth/reset-password', {
    method: 'POST',
    body: { email: { contains: '@' }, code: '000000', new_password: 'whatever1' }
  })
  assert.equal(reset.status, 400)
})

test('normal string payloads still work', async () => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: { email: ACCOUNTS.buyer2, password: 'password123' }
  })
  assert.equal(res.status, 200)
})

test('shop profile text fields are length-capped', async () => {
  const seller = await login(ACCOUNTS.seller1)
  const before = (await req('/shops/me', { token: seller })).json.data.description
  const res = await req('/shops/me', {
    method: 'PATCH',
    token: seller,
    body: { description: 'x'.repeat(5000) }
  })
  assert.equal(res.status, 200)
  assert.equal(res.json.data.description.length, 2000)
  await req('/shops/me', { method: 'PATCH', token: seller, body: { description: before } })
})
