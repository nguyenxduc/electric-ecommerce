import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const seller2 = await login(ACCOUNTS.seller2)

test('platform voucher validates against the order amount', async () => {
  const ok = await req('/coupons/validate', {
    method: 'POST',
    body: { code: 'WELCOME10', amount: 500 }
  })
  assert.equal(ok.status, 200)
  assert.equal(ok.json?.discount, 50, '10% of 500')

  const belowMin = await req('/coupons/validate', {
    method: 'POST',
    body: { code: 'WELCOME10', amount: 10 } // min_order is 100
  })
  assert.equal(belowMin.status, 400)

  const unknown = await req('/coupons/validate', {
    method: 'POST',
    body: { code: 'NOPE123', amount: 500 }
  })
  assert.equal(unknown.status, 404)
})

test('shop vouchers expose their shop in the validate response', async () => {
  const res = await req('/coupons/validate', {
    method: 'POST',
    body: { code: 'TECHWORLD10', amount: 500 }
  })
  assert.equal(res.status, 200)
  assert.equal(res.json?.coupon?.shop?.slug, 'tech-world')
})

test('public shop voucher list shows collectible codes', async () => {
  const res = await req('/coupons/shop/tech-world')
  assert.equal(res.status, 200)
  const codes = (res.json?.data?.coupons || []).map(c => c.code)
  assert.ok(codes.includes('TECHWORLD10'), `codes=${codes}`)
})

test('seller voucher CRUD is scoped to their own shop', async () => {
  const created = await req('/coupons/shop', {
    method: 'POST',
    token: seller1,
    body: {
      code: 'SUITEVC9',
      discount_type: 'fixed',
      discount_value: 9,
      min_order: 20
    }
  })
  assert.equal(created.status, 201)

  const mine = (await req('/coupons/shop/mine/list', { token: seller1 })).json
  const voucher = mine?.coupons?.find(c => c.code === 'SUITEVC9')
  assert.ok(voucher, 'voucher listed for its owner')

  // another seller cannot delete it
  const foreignDelete = await req(`/coupons/shop/${voucher.id}`, {
    method: 'DELETE',
    token: seller2
  })
  assert.equal(foreignDelete.status, 404)

  // duplicate code rejected
  const dup = await req('/coupons/shop', {
    method: 'POST',
    token: seller2,
    body: { code: 'SUITEVC9', discount_type: 'fixed', discount_value: 1 }
  })
  assert.equal(dup.status, 400)

  // owner deletes it
  const del = await req(`/coupons/shop/${voucher.id}`, {
    method: 'DELETE',
    token: seller1
  })
  assert.equal(del.status, 200)
})

test('admin coupon list includes shop vouchers', async () => {
  const res = await req('/coupons?q=GADGET5', { token: admin })
  assert.equal(res.status, 200)
  assert.ok(res.json?.coupons?.some(c => c.code === 'GADGET5'))
})
