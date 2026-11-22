import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS } from './helpers.mjs'

// Gioi han so lan dung voucher moi nguoi mua (per_user_limit): chan o validate,
// quote, kho voucher va dat don; huy don tra luot; nguoi khac van dung duoc.

const admin = await login(ACCOUNTS.admin)
const buyer2 = await login(ACCOUNTS.buyer2)
const buyer = await login(ACCOUNTS.buyer)

const stamp = Date.now()
const code = `PERUSER${stamp}`
const orderIds = []
let couponId

after(async () => {
  for (const [token, id] of orderIds) {
    await req(`/orders/${id}/cancel`, { method: 'PATCH', token })
  }
  if (couponId) {
    await prisma.couponClaim.deleteMany({ where: { coupon_id: BigInt(couponId) } })
    await req(`/coupons/admin/${couponId}`, { method: 'DELETE', token: admin })
  }
})

const orderableItem = async () => {
  const list = await req('/shops/tech-world/products?limit=20')
  const p = (list.json?.products ?? [])
    .filter(x => !(x.variants?.length) && (x.quantity ?? 0) > 0)
    .sort((x, y) => (y.quantity ?? 0) - (x.quantity ?? 0))[0]
  assert.ok(p, 'tech-world khong co san pham dat duoc')
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  const color = colors.find(c => (c.quantity ?? 1) > 0)
  return {
    product_id: p.id,
    quantity: 1,
    ...(color && { color: { name: color.name, code: color.code } })
  }
}

const place = async (token, phone = '0900000001') =>
  req('/orders', {
    method: 'POST',
    token,
    body: {
      items: [await orderableItem()],
      shipping_address: { name: 'PerUser Test', phone, address: 'HN' },
      payment_method: 'cod',
      coupon_code: code
    }
  })

const validate = token =>
  req('/coupons/validate', { method: 'POST', token, body: { code, amount: 100 } })

test('per_user_limit validated on create', async () => {
  const bad = await req('/coupons', {
    method: 'POST',
    token: admin,
    body: { code: `BAD${stamp}`, discount_value: 5, per_user_limit: 0 }
  })
  assert.equal(bad.status, 400)

  const res = await req('/coupons', {
    method: 'POST',
    token: admin,
    body: { code, discount_value: 5, usage_limit: 50, per_user_limit: 1 }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json))
  couponId = res.json.coupon.id
  assert.equal(res.json.coupon.per_user_limit, 1)
})

test('first use ok, second blocked everywhere', async () => {
  assert.equal((await validate(buyer2)).status, 200)

  const first = await place(buyer2)
  assert.equal(first.status, 201, JSON.stringify(first.json))
  orderIds.push([buyer2, first.json.orders[0].id])

  const v = await validate(buyer2)
  assert.equal(v.status, 400)
  assert.equal(v.json.message, 'You have already used this voucher')

  await req(`/coupons/${couponId}/claim`, { method: 'POST', token: buyer2 })
  const quote = await req('/coupons/quote', {
    method: 'POST',
    token: buyer2,
    body: { amount: 100, shop_amounts: {} }
  })
  const q = quote.json.data.coupons.find(c => c.code === code)
  assert.equal(q.applicable, false)
  assert.equal(q.reason, 'You have already used this voucher')

  const wh = await req('/coupons/my', { token: buyer2 })
  assert.equal(wh.json.data.coupons.find(c => c.code === code).status, 'used_by_you')

  const second = await place(buyer2)
  assert.equal(second.status, 400)
  assert.equal(second.json.message, 'You have already used this voucher')
})

test('another buyer can still use it', async () => {
  assert.equal((await validate(buyer)).status, 200)
  const res = await place(buyer, '0911222333')
  assert.equal(res.status, 201, JSON.stringify(res.json))
  orderIds.push([buyer, res.json.orders[0].id])
})

test('cancelling the order frees the use', async () => {
  const [, id] = orderIds[0]
  const cancel = await req(`/orders/${id}/cancel`, { method: 'PATCH', token: buyer2 })
  assert.equal(cancel.status, 200)
  assert.equal((await validate(buyer2)).status, 200)
})
