// "Pay now" cho don MoMo chua tra: POST /payments/momo/retry chi tao lai giao
// dich khi checkout cua chinh nguoi goi, con pending, chua paid, chua het han.
// Nhanh thanh cong goi that toi sandbox MoMo nen chi chay khi MOMO_LIVE_TESTS=1
// (giong 14-concurrency); cac nhanh tu choi tra loi truoc khi goi MoMo.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'

after(() => prisma.$disconnect())

const buyer = await login(ACCOUNTS.buyer)
const other = await login(ACCOUNTS.buyer2)
const p = await firstProductOf('gadget-hub')

const placeMomo = async () => {
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [{ product_id: p.id, quantity: 1, color: p.available_colors?.[0] || null }],
      shipping_address: { name: 'Jane', phone: '0912345678', address: 'Demo St' },
      payment_method: 'momo'
    }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json).slice(0, 200))
  const order = res.json.orders[0]
  return { orderId: order.id, groupId: String(order.order_group_id ?? res.json.order_group.id) }
}

const retry = (token, order_group_id) =>
  req('/payments/momo/retry', { method: 'POST', token, body: { order_group_id } })

const cancel = id => req(`/orders/${id}/cancel`, { method: 'PATCH', token: buyer, body: { reason: 'test' } })

test('retry: thieu/sai id -> 400, khong ton tai -> 404, nguoi khac -> 403', async () => {
  assert.equal((await retry(buyer, 'abc')).status, 400)
  assert.equal((await retry(buyer, '999999999')).status, 404)
  const { orderId, groupId } = await placeMomo()
  try {
    assert.equal((await retry(other, groupId)).status, 403)
    assert.equal((await req('/payments/momo/retry', { method: 'POST', body: { order_group_id: groupId } })).status, 401)
  } finally {
    await cancel(orderId)
  }
})

test('retry: checkout da paid -> 400', async () => {
  const { orderId, groupId } = await placeMomo()
  const tag = Date.now()
  await prisma.payment.create({
    data: {
      order_group_id: BigInt(groupId), provider: 'momo', amount: 1, currency: 'USD',
      status: 'paid', momo_order_id: `RT${tag}`, momo_request_id: `RTR${tag}`
    }
  })
  try {
    const res = await retry(buyer, groupId)
    assert.equal(res.status, 400)
    assert.match(res.json.message, /no longer awaiting payment/)
    // Duong tao thanh toan goc cung khong duoc thu lan hai cho checkout da tra
    const direct = await req('/payments/momo', { method: 'POST', token: buyer, body: { order_group_id: groupId } })
    assert.equal(direct.status, 400)
    assert.match(direct.json.message, /already paid/)
  } finally {
    await cancel(orderId)
  }
})

test('retry: checkout da huy -> 400', async () => {
  const { orderId, groupId } = await placeMomo()
  assert.equal((await cancel(orderId)).status, 200)
  assert.equal((await retry(buyer, groupId)).status, 400)
})

test('retry: qua han giu cho (cung moc voi job het han) -> 400', async () => {
  const { orderId, groupId } = await placeMomo()
  await prisma.order.update({
    where: { id: BigInt(orderId) },
    data: { created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  })
  try {
    const res = await retry(buyer, groupId)
    assert.equal(res.status, 400)
    assert.match(res.json.message, /expired/)
  } finally {
    await cancel(orderId)
  }
})

test('retry: don hop le tao lai link va huy payment pending cu', {
  skip: process.env.MOMO_LIVE_TESTS !== '1' && 'can sandbox MoMo that: dat MOMO_LIVE_TESTS=1'
}, async () => {
  const { orderId, groupId } = await placeMomo()
  const tag = Date.now()
  const old = await prisma.payment.create({
    data: {
      order_group_id: BigInt(groupId), provider: 'momo', amount: 1, currency: 'USD',
      status: 'pending', momo_order_id: `RO${tag}`, momo_request_id: `ROR${tag}`
    }
  })
  try {
    const res = await retry(buyer, groupId)
    assert.equal(res.status, 200, JSON.stringify(res.json))
    assert.ok(res.json.payUrl)
    const prev = await prisma.payment.findUnique({ where: { id: old.id } })
    assert.equal(prev.status, 'canceled')
  } finally {
    await cancel(orderId)
  }
})
