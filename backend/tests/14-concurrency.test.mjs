import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS } from './helpers.mjs'

// Cac kich ban bien cua nghiep vu thanh toan.
//
// Ba tinh huong o day deu la loai "chay dung mot lan thi khong bao gio thay",
// chi lo ra khi co hai luong cung cham vao mot ban ghi, hoac khi cong thanh
// toan phat lai mot callback. Do la ly do phai co test tu dong: khong the tai
// hien bang tay trong lucdemo.

const buyer1 = await login(ACCOUNTS.buyer)
const buyer2 = await login(ACCOUNTS.buyer2)

const placeOrder = (token, items, extra = {}) =>
  req('/orders', {
    method: 'POST',
    token,
    body: {
      items,
      shipping_address: { name: 'Race Test', phone: '0900000000', address: 'HN' },
      payment_method: 'cod',
      ...extra
    }
  })

/** Dat ton kho ve dung mot con so, tra lai ham khoi phuc trang thai cu. */
const forceStock = async (productId, qty) => {
  const before = await prisma.product.findUnique({
    where: { id: BigInt(productId) },
    select: { quantity: true, product_colors: { select: { id: true, quantity: true } } }
  })
  await prisma.product.update({
    where: { id: BigInt(productId) },
    data: { quantity: qty }
  })
  const firstColor = before.product_colors[0]
  if (firstColor) {
    await prisma.productColor.update({
      where: { id: firstColor.id },
      data: { quantity: qty }
    })
    for (const c of before.product_colors.slice(1)) {
      await prisma.productColor.update({ where: { id: c.id }, data: { quantity: 0 } })
    }
  }
  return async () => {
    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: { quantity: before.quantity }
    })
    for (const c of before.product_colors) {
      await prisma.productColor.update({ where: { id: c.id }, data: { quantity: c.quantity } })
    }
  }
}

test('hai nguoi mua cung luc mon hang con dung 1 cai: chi mot don di lot', async () => {
  const list = await req('/shops/tech-world/products?limit=20')
  const candidate = (list.json?.products ?? [])
    .filter(p => (p.quantity ?? 0) > 3)
    .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0]
  assert.ok(candidate, 'khong tim duoc san pham de thu nghiem')

  const restore = await forceStock(candidate.id, 1)
  try {
    const detail = await req(`/products/${candidate.id}`)
    const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
    const item = {
      product_id: candidate.id,
      quantity: 1,
      ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } })
    }

    const results = await Promise.all([
      placeOrder(buyer1, [item]),
      placeOrder(buyer2, [item])
    ])
    const ok = results.filter(r => [200, 201].includes(r.status)).length

    assert.equal(ok, 1, `${ok}/2 don duoc tao tu mon hang chi con 1 cai`)

    const after = await prisma.product.findUnique({
      where: { id: BigInt(candidate.id) },
      select: { quantity: true, product_colors: { select: { quantity: true } } }
    })
    assert.ok(after.quantity >= 0, `ton kho am: ${after.quantity}`)
    for (const c of after.product_colors) {
      assert.ok(c.quantity >= 0, `ton kho mau am: ${c.quantity}`)
    }
  } finally {
    await restore()
  }
})

// --- IPN phat lai -----------------------------------------------------------

const SECRET = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85'
const field = v => (v == null ? '' : String(v))

const signPayload = p =>
  crypto
    .createHmac('sha256', SECRET)
    .update(
      `accessKey=${ACCESS_KEY}` +
        `&amount=${field(p.amount)}` +
        `&extraData=${field(p.extraData)}` +
        `&message=${field(p.message)}` +
        `&orderId=${field(p.orderId)}` +
        `&orderInfo=${field(p.orderInfo)}` +
        `&orderType=${field(p.orderType)}` +
        `&partnerCode=${field(p.partnerCode)}` +
        `&payType=${field(p.payType)}` +
        `&requestId=${field(p.requestId)}` +
        `&responseTime=${field(p.responseTime)}` +
        `&resultCode=${field(p.resultCode)}` +
        `&transId=${field(p.transId)}`
    )
    .digest('hex')

test('IPN hop le phat lai lan hai khong ghi de ban ghi thanh toan', async () => {
  // Dung don that de co ban ghi payment that: cong thanh toan retry callback
  // la chuyen binh thuong, va ke tan cong cung co the phat lai payload hop le.
  const list = await req('/shops/tech-world/products?limit=20')
  const p = (list.json?.products ?? []).find(x => (x.quantity ?? 0) > 2)
  assert.ok(p, 'khong co san pham de dat don')
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []

  const created = await placeOrder(buyer1, [
    {
      product_id: p.id,
      quantity: 1,
      ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } })
    }
  ])
  assert.ok([200, 201].includes(created.status), 'khong dat duoc don thu nghiem')

  const groupId =
    created.json?.data?.order_group?.id ??
    created.json?.data?.order_group_id ??
    created.json?.order_group?.id
  assert.ok(groupId, `khong lay duoc order_group_id: ${JSON.stringify(created.json).slice(0, 200)}`)

  const pay = await req('/payments/momo', {
    method: 'POST',
    token: buyer1,
    body: { order_group_id: groupId, orderInfo: 'Test replay' }
  })
  assert.ok([200, 201].includes(pay.status), `tao thanh toan that bai: ${JSON.stringify(pay.json).slice(0, 200)}`)

  const payment = await prisma.payment.findFirst({
    where: { order_group_id: BigInt(groupId) },
    orderBy: { id: 'desc' }
  })
  assert.ok(payment, 'khong tim thay ban ghi payment')

  const payload = {
    partnerCode: 'MOMO',
    orderId: payment.momo_order_id,
    requestId: payment.momo_request_id,
    amount: String(payment.amount),
    orderInfo: 'Test replay',
    orderType: 'momo_wallet',
    transId: '111111',
    resultCode: 0,
    message: 'Successful.',
    payType: 'qr',
    responseTime: '1700000000000',
    extraData: ''
  }
  payload.signature = signPayload(payload)

  const first = await req('/payments/momo-ipn', { method: 'POST', body: payload })
  assert.equal(first.status, 200)
  const afterFirst = await prisma.payment.findUnique({ where: { id: payment.id } })
  assert.equal(afterFirst.status, 'paid', `trang thai sau IPN dau: ${afterFirst.status}`)

  // Phat lai y het payload, chi doi transId nhu mot lan retry thuc te.
  const replay = { ...payload, transId: '222222' }
  replay.signature = signPayload(replay)
  const second = await req('/payments/momo-ipn', { method: 'POST', body: replay })
  assert.equal(second.status, 200, 'cong thanh toan phai luon nhan 200 de ngung retry')

  const afterSecond = await prisma.payment.findUnique({ where: { id: payment.id } })
  assert.equal(afterSecond.status, 'paid')
  assert.equal(
    afterSecond.momo_trans_id,
    afterFirst.momo_trans_id,
    'transId bi ghi de boi callback phat lai'
  )
  assert.equal(
    afterSecond.paid_at?.getTime(),
    afterFirst.paid_at?.getTime(),
    'paid_at bi ghi de boi callback phat lai'
  )
})

test.after(async () => {
  await prisma.$disconnect()
})
