import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, round2 } from './helpers.mjs'
import {
  selectExpiredUnpaidOrders,
  expireUnpaidOrders
} from '../jobs/expireUnpaidOrders.js'

// SKU variants + het han giu cho. Test tu tao san pham rieng (khong dung seed)
// va soft-delete khi xong; don test deu bi huy nen kho tra ve nguyen.

const seller = await login(ACCOUNTS.seller1)
const buyer1 = await login(ACCOUNTS.buyer)
const buyer2 = await login(ACCOUNTS.buyer2)
const tag = Date.now().toString(36)
const ok = r => [200, 201].includes(r.status)

const placeOrder = (token, items, payment_method = 'cod') =>
  req('/orders', {
    method: 'POST',
    token,
    body: {
      items,
      shipping_address: { name: 'Variant Test', phone: '0900000000', address: 'HN' },
      payment_method
    }
  })

const category = await prisma.category.findFirst({ where: { deleted_at: null } })
const created = await req('/products', {
  method: 'POST',
  token: seller,
  body: {
    name: `Variant Phone ${tag}`,
    price: 100,
    discount: 10,
    description: 'variant test',
    category_id: category.id.toString(),
    variants: [
      { sku: `VT-A-${tag}`, name: '128GB', attributes: { storage: '128GB' }, price_delta: 0, quantity: 3 },
      { sku: `VT-B-${tag}`, name: '256GB', attributes: { storage: '256GB' }, price_delta: 20, quantity: 1 }
    ]
  }
})
assert.ok(ok(created), `tao san pham that bai: ${JSON.stringify(created.json)}`)
const pid = BigInt(created.json.product.id)
const variants = await prisma.productVariant.findMany({ where: { product_id: pid }, orderBy: { id: 'asc' } })
const [vA, vB] = variants
const orderIds = []

const stock = async () => ({
  a: (await prisma.productVariant.findUnique({ where: { id: vA.id } })).quantity,
  b: (await prisma.productVariant.findUnique({ where: { id: vB.id } })).quantity,
  p: (await prisma.product.findUnique({ where: { id: pid } })).quantity
})

const cancelAll = async () => {
  for (const id of orderIds.splice(0)) {
    await req(`/orders/${id}/cancel`, { method: 'PATCH', token: buyer1 })
    await req(`/orders/${id}/cancel`, { method: 'PATCH', token: buyer2 })
  }
}
const orderIdsOf = r => (r.json?.orders ?? []).map(o => o.id)

after(async () => {
  await cancelAll()
  await prisma.cartItem.deleteMany({ where: { product_id: pid } })
  await prisma.product.update({ where: { id: pid }, data: { deleted_at: new Date() } })
  await prisma.$disconnect()
})

test('tao san pham: quantity = tong bien the, detail va list tra variants', async () => {
  assert.deepEqual(await stock(), { a: 3, b: 1, p: 4 })
  const detail = await req(`/products/${pid}`)
  const body = detail.json?.data ?? detail.json
  assert.equal(body.variants.length, 2)
  assert.deepEqual(Object.keys(body.variants[0]).sort(), ['attributes', 'id', 'name', 'price_delta', 'quantity', 'sku'])
  assert.equal(body.variants[1].price_delta, 20)
  const shopList = await req('/products/shop/mine?limit=50', { token: seller })
  const item = shopList.json.products.find(p => String(p.id) === String(pid))
  assert.equal(item?.variants?.length, 2)
})

test('sku trung -> 409; gia tri sai -> 400', async () => {
  const dup = await req('/products', {
    method: 'POST',
    token: seller,
    body: { name: `Dup ${tag}`, price: 10, category_id: category.id.toString(), variants: [{ sku: vA.sku, name: 'x', quantity: 1 }] }
  })
  assert.equal(dup.status, 409)
  for (const bad of [{ quantity: -1 }, { quantity: 1.5 }, { price_delta: 'abc' }, { sku: '' }]) {
    const r = await req('/products', {
      method: 'POST',
      token: seller,
      body: { name: `Bad ${tag}`, price: 10, category_id: category.id.toString(), variants: [{ sku: `BAD-${tag}`, name: 'x', quantity: 1, ...bad }] }
    })
    assert.equal(r.status, 400, JSON.stringify(bad))
  }
})

test('cart: bat buoc variant_id, moi bien the la mot dong rieng, gia gom price_delta', async () => {
  const none = await req(`/cart/add_item/${pid}`, { method: 'POST', token: buyer2, body: { quantity: 1 } })
  assert.equal(none.status, 400)
  for (const v of [vA, vB]) {
    const r = await req(`/cart/add_item/${pid}`, {
      method: 'POST', token: buyer2, body: { quantity: 1, variant_id: v.id.toString() }
    })
    assert.ok(ok(r), JSON.stringify(r.json))
  }
  const cart = await req('/cart', { token: buyer2 })
  const lines = cart.json.cart.items.filter(i => String(i.product_id) === String(pid))
  assert.equal(lines.length, 2)
  const byId = Object.fromEntries(lines.map(l => [String(l.variant.id), l]))
  assert.equal(byId[vA.id.toString()].unit_final_price, 90)
  assert.equal(byId[vB.id.toString()].unit_final_price, 110)
  await prisma.cartItem.deleteMany({ where: { product_id: pid } })
})

test('order: variant bat buoc, gia gom price_delta, ton kho tru va hoan lai khi huy', async () => {
  assert.equal((await placeOrder(buyer1, [{ product_id: pid.toString(), quantity: 1 }])).status, 400)
  const other = await prisma.productVariant.findFirst({ where: { product_id: { not: pid } } })
  if (other) {
    const r = await placeOrder(buyer1, [{ product_id: pid.toString(), quantity: 1, variant_id: other.id.toString() }])
    assert.equal(r.status, 400)
  }
  const res = await placeOrder(buyer1, [{ product_id: pid.toString(), quantity: 2, variant_id: vA.id.toString() }])
  assert.ok(ok(res), JSON.stringify(res.json))
  orderIds.push(...orderIdsOf(res))
  const item = await prisma.orderItem.findFirst({ where: { order_id: BigInt(orderIds[0]) } })
  assert.equal(item.variant_id, vA.id)
  assert.equal(round2(item.unit_price), 90)
  assert.deepEqual(await stock(), { a: 1, b: 1, p: 2 })

  await cancelAll()
  assert.deepEqual(await stock(), { a: 3, b: 1, p: 4 })
})

test('hai nguoi mua cung luc don vi cuoi cua mot bien the: chi mot thanh cong', async () => {
  const item = { product_id: pid.toString(), quantity: 1, variant_id: vB.id.toString() }
  const rs = await Promise.all([placeOrder(buyer1, [item]), placeOrder(buyer2, [item])])
  rs.forEach(r => orderIds.push(...orderIdsOf(r)))
  assert.equal(rs.filter(ok).length, 1)
  assert.deepEqual(await stock(), { a: 3, b: 0, p: 3 })
  await cancelAll()
  assert.deepEqual(await stock(), { a: 3, b: 1, p: 4 })
})

test('het han giu cho: don momo cu chua tra bi huy va tra kho; IPN tre ghi REFUND_OWED', async () => {
  const res = await placeOrder(buyer1, [{ product_id: pid.toString(), quantity: 1, variant_id: vA.id.toString() }], 'momo')
  assert.ok(ok(res), JSON.stringify(res.json))
  const id = BigInt(orderIdsOf(res)[0])
  orderIds.push(id.toString())
  const order = await prisma.order.findUnique({ where: { id } })
  assert.deepEqual(await stock(), { a: 2, b: 1, p: 3 })

  // don moi chua den han
  assert.ok(!(await selectExpiredUnpaidOrders()).some(o => o.id === id))

  await prisma.order.update({ where: { id }, data: { created_at: new Date(Date.now() - 2 * 3600 * 1000) } })
  assert.ok((await selectExpiredUnpaidOrders()).some(o => o.id === id))

  // checkout da co payment paid thi khong bi chon
  const payment = await prisma.payment.create({
    data: {
      order_group_id: order.order_group_id, provider: 'momo', amount: order.total_amount,
      currency: 'USD', status: 'pending', momo_order_id: `VT${tag}`, momo_request_id: `VTR${tag}`
    }
  })
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'paid' } })
  assert.ok(!(await selectExpiredUnpaidOrders()).some(o => o.id === id))
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'pending' } })

  await expireUnpaidOrders()
  const cancelled = await prisma.order.findUnique({ where: { id } })
  assert.equal(cancelled.status, 'cancelled')
  assert.deepEqual(await stock(), { a: 3, b: 1, p: 4 })
  // chay lai khong lam gi them (idempotent)
  await expireUnpaidOrders()
  assert.deepEqual(await stock(), { a: 3, b: 1, p: 4 })

  // IPN hop le toi sau khi don da huy: khong hoi sinh, ghi no hoan tien
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'pending' } })
  const p = {
    partnerCode: 'MOMO', orderId: payment.momo_order_id, requestId: payment.momo_request_id,
    amount: String(payment.amount), orderInfo: 'late', orderType: 'momo_wallet', transId: '222',
    resultCode: 0, message: 'Successful.', payType: 'qr', responseTime: '1700000000000', extraData: ''
  }
  const f = v => (v == null ? '' : String(v))
  const secret = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
  const access = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85'
  p.signature = crypto.createHmac('sha256', secret).update(
    `accessKey=${access}&amount=${f(p.amount)}&extraData=${f(p.extraData)}&message=${f(p.message)}` +
    `&orderId=${f(p.orderId)}&orderInfo=${f(p.orderInfo)}&orderType=${f(p.orderType)}&partnerCode=${f(p.partnerCode)}` +
    `&payType=${f(p.payType)}&requestId=${f(p.requestId)}&responseTime=${f(p.responseTime)}` +
    `&resultCode=${f(p.resultCode)}&transId=${f(p.transId)}`
  ).digest('hex')
  const ipn = await req('/payments/momo-ipn', { method: 'POST', body: p })
  assert.equal(ipn.status, 200)
  assert.equal((await prisma.order.findUnique({ where: { id } })).status, 'cancelled')
  await new Promise(r => setTimeout(r, 300))
  const log = await prisma.auditLog.findFirst({
    where: { action: 'REFUND_OWED', resource_id: order.order_group_id },
    orderBy: { id: 'desc' }
  })
  assert.ok(log, 'thieu audit REFUND_OWED')
  assert.equal(log.metadata.reason, 'payment received after orders cancelled')
})
