import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, round2 } from './helpers.mjs'

// Voucher kieu Shopee: luu voucher, kho voucher, quy tac hieu luc tap trung
// (tam dung, chua bat dau, tran giam) va seller sua voucher cua shop minh.

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const seller2 = await login(ACCOUNTS.seller2)
const buyer = await login(ACCOUNTS.buyer)
const jane = await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer } })

const created = []
const stamp = Date.now()
const DAY = 24 * 60 * 60 * 1000

const adminCoupon = async body => {
  const res = await req('/coupons', { method: 'POST', token: admin, body })
  assert.equal(res.status, 201, JSON.stringify(res.json))
  created.push(res.json.coupon.id)
  return res.json.coupon
}

after(async () => {
  const ids = created.map(id => BigInt(id))
  await prisma.couponClaim.deleteMany({ where: { coupon_id: { in: ids } } })
  await prisma.coupon.updateMany({ where: { id: { in: ids } }, data: { deleted_at: new Date() } })
})

const orderableItem = async () => {
  const list = await req('/shops/tech-world/products?limit=20')
  const p = (list.json?.products ?? [])
    .filter(x => !(x.variants?.length) && (x.quantity ?? 0) > 0)
    .sort((x, y) => (y.quantity ?? 0) - (x.quantity ?? 0))[0]
  assert.ok(p, 'tech-world khong co san pham dat duoc')
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  // DB dung chung: chon mau con hang
  const color = colors.find(c => (c.quantity ?? 1) > 0)
  return {
    product_id: p.id,
    quantity: 1,
    ...(color && { color: { name: color.name, code: color.code } })
  }
}

const placeOrder = async code =>
  req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [await orderableItem()],
      shipping_address: { name: 'Voucher Test', phone: '0900000000', address: 'HN' },
      payment_method: 'cod',
      coupon_code: code
    }
  })

test('luu voucher cong khai la idempotent va voucher hien trong kho', async () => {
  const c = await adminCoupon({
    code: `CLAIM${stamp}`,
    discount_type: 'fixed',
    discount_value: 2,
    min_order: 0,
    usage_limit: 100
  })
  const first = await req(`/coupons/${c.id}/claim`, { method: 'POST', token: buyer })
  const second = await req(`/coupons/${c.id}/claim`, { method: 'POST', token: buyer })
  assert.equal(first.status, 200, JSON.stringify(first.json))
  assert.equal(second.status, 200)
  const count = await prisma.couponClaim.count({
    where: { coupon_id: BigInt(c.id), user_id: jane.id }
  })
  assert.equal(count, 1, 'luu hai lan chi tao mot ban ghi')

  const mine = await req('/coupons/my', { token: buyer })
  const inWarehouse = mine.json?.data?.coupons?.find(v => v.code === c.code)
  assert.ok(inWarehouse, 'voucher da luu phai nam trong kho')
  assert.equal(inWarehouse.source, 'claimed')
  assert.equal(inWarehouse.status, 'active')

  const claimable = await req('/coupons/claimable', { token: buyer })
  assert.equal(claimable.json?.data?.coupons?.find(v => v.code === c.code)?.claimed, true)
  const guest = await req('/coupons/claimable')
  assert.equal(guest.json?.data?.coupons?.find(v => v.code === c.code)?.claimed, false)

  // validate-my nhan voucher da luu
  const my = await req('/coupons/validate-my', {
    method: 'POST',
    token: buyer,
    body: { code: c.code, amount: 50 }
  })
  assert.equal(my.status, 200, JSON.stringify(my.json))
  assert.equal(my.json.discount, 2)

  // bo luu: bien khoi kho
  const un = await req(`/coupons/${c.id}/claim`, { method: 'DELETE', token: buyer })
  assert.equal(un.status, 200)
  const after = await req('/coupons/my', { token: buyer })
  assert.ok(!after.json?.data?.coupons?.some(v => v.code === c.code))
})

test('khong luu duoc voucher danh rieng cho nguoi dung khac', async () => {
  const c = await adminCoupon({
    code: `PRIV${stamp}`,
    discount_type: 'fixed',
    discount_value: 3
  })
  const john = await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer2 } })
  await prisma.coupon.update({
    where: { id: BigInt(c.id) },
    data: { users: { connect: { id: john.id } } }
  })
  const res = await req(`/coupons/${c.id}/claim`, { method: 'POST', token: buyer })
  assert.equal(res.status, 403)
  // va validate cung tu choi voi nguoi khong so huu
  const v = await req('/coupons/validate', {
    method: 'POST',
    token: buyer,
    body: { code: c.code, amount: 100 }
  })
  assert.equal(v.status, 403)
})

test('voucher tam dung bi tu choi o validate va khi dat hang', async () => {
  const c = await adminCoupon({
    code: `PAUSE${stamp}`,
    discount_type: 'fixed',
    discount_value: 1,
    min_order: 0,
    usage_limit: 100,
    is_active: false
  })
  const v = await req('/coupons/validate', { method: 'POST', body: { code: c.code, amount: 100 } })
  assert.equal(v.status, 400)
  assert.equal(v.json?.code, 'COUPON_PAUSED')
  const order = await placeOrder(c.code)
  assert.equal(order.status, 400, JSON.stringify(order.json))
  assert.match(order.json?.message ?? '', /paused/i)
})

test('voucher chua toi ngay bat dau bi tu choi', async () => {
  const c = await adminCoupon({
    code: `SOON${stamp}`,
    discount_type: 'fixed',
    discount_value: 1,
    min_order: 0,
    usage_limit: 100,
    starts_at: new Date(Date.now() + DAY).toISOString(),
    expires_at: new Date(Date.now() + 5 * DAY).toISOString()
  })
  const v = await req('/coupons/validate', { method: 'POST', body: { code: c.code, amount: 100 } })
  assert.equal(v.status, 400)
  assert.equal(v.json?.code, 'COUPON_NOT_STARTED')
  const order = await placeOrder(c.code)
  assert.equal(order.status, 400)
})

test('max_discount gioi han voucher phan tram khi dat hang', async () => {
  const c = await adminCoupon({
    code: `CAP${stamp}`,
    discount_type: 'percent',
    discount_value: 50,
    max_discount: 3,
    min_order: 0,
    usage_limit: 100
  })
  const v = await req('/coupons/validate', { method: 'POST', body: { code: c.code, amount: 100 } })
  assert.equal(v.json?.discount, 3, '50% cua 100 bi chan o 3')

  const order = await placeOrder(c.code)
  assert.equal(order.status, 201, JSON.stringify(order.json).slice(0, 200))
  assert.equal(round2(Number(order.json.order_group.coupon_discount)), 3)
})

test('voucher shop: validate kiem pham vi theo shop_amounts', async () => {
  const twId = String((await req('/shops/tech-world')).json.data.id)
  const ghId = String((await req('/shops/gadget-hub')).json.data.id)
  const otherShop = await req('/coupons/validate', {
    method: 'POST',
    body: { code: 'TECHWORLD10', amount: 200, shop_amounts: { [ghId]: 200 } }
  })
  assert.equal(otherShop.status, 400)
  assert.equal(otherShop.json?.code, 'COUPON_SHOP_MISSING')
  const ok = await req('/coupons/validate', {
    method: 'POST',
    body: { code: 'TECHWORLD10', amount: 300, shop_amounts: { [twId]: 100, [ghId]: 200 } }
  })
  assert.equal(ok.status, 200)
  assert.equal(ok.json.discount, 10, '10% chi tren 100 cua Tech World')
})

test('seller sua, tam dung va bat lai voucher cua shop minh; khong sua duoc shop khac', async () => {
  const res = await req('/coupons/shop', {
    method: 'POST',
    token: seller1,
    body: { code: `SELL${stamp}`, discount_type: 'percent', discount_value: 5, min_order: 10 }
  })
  assert.equal(res.status, 201)
  const id = res.json.coupon.id
  created.push(id)

  const foreign = await req(`/coupons/shop/${id}`, {
    method: 'PUT',
    token: seller2,
    body: { discount_value: 99 }
  })
  assert.equal(foreign.status, 404)

  const edit = await req(`/coupons/shop/${id}`, {
    method: 'PUT',
    token: seller1,
    body: { discount_value: 8, max_discount: 4, description: 'edited' }
  })
  assert.equal(edit.status, 200, JSON.stringify(edit.json))
  assert.equal(Number(edit.json.coupon.discount_value), 8)
  assert.equal(Number(edit.json.coupon.max_discount), 4)

  const pause = await req(`/coupons/shop/${id}`, {
    method: 'PUT',
    token: seller1,
    body: { is_active: false }
  })
  assert.equal(pause.json.coupon.status, 'paused')
  const resume = await req(`/coupons/shop/${id}`, {
    method: 'PUT',
    token: seller1,
    body: { is_active: true }
  })
  assert.equal(resume.json.coupon.status, 'active')

  const badPercent = await req(`/coupons/shop/${id}`, {
    method: 'PUT',
    token: seller1,
    body: { discount_value: 150 }
  })
  assert.equal(badPercent.status, 400)
})
