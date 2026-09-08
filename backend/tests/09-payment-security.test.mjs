import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { req } from './helpers.mjs'

// Endpoint IPN cua MoMo phai cong khai (cong thanh toan goi vao, khong co JWT),
// nen chu ky HMAC la thu duy nhat xac thuc nguoi goi. Neu thieu buoc kiem chung
// nay thi bat ky ai doan duoc requestId cung co the danh dau don da thanh toan.

const SECRET = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85'

const field = v => (v == null ? '' : String(v))

const signPayload = payload => {
  const raw =
    `accessKey=${ACCESS_KEY}` +
    `&amount=${field(payload.amount)}` +
    `&extraData=${field(payload.extraData)}` +
    `&message=${field(payload.message)}` +
    `&orderId=${field(payload.orderId)}` +
    `&orderInfo=${field(payload.orderInfo)}` +
    `&orderType=${field(payload.orderType)}` +
    `&partnerCode=${field(payload.partnerCode)}` +
    `&payType=${field(payload.payType)}` +
    `&requestId=${field(payload.requestId)}` +
    `&responseTime=${field(payload.responseTime)}` +
    `&resultCode=${field(payload.resultCode)}` +
    `&transId=${field(payload.transId)}`
  return crypto.createHmac('sha256', SECRET).update(raw).digest('hex')
}

const basePayload = () => ({
  partnerCode: 'MOMO',
  orderId: 'MOMO_SEC_TEST_1',
  requestId: 'MOMO_SEC_TEST_1',
  amount: '250000',
  orderInfo: 'Thanh toan don hang',
  orderType: 'momo_wallet',
  transId: '99999',
  resultCode: 0,
  message: 'Successful.',
  payType: 'qr',
  responseTime: '1700000000000',
  extraData: ''
})

const postIpn = body =>
  req('/payments/momo-ipn', { method: 'POST', body })

test('IPN khong kem chu ky bi tu choi', async () => {
  const res = await postIpn(basePayload())
  assert.equal(res.status, 400)
  assert.match(String(res.json?.error), /signature/i)
})

test('IPN voi chu ky bia bi tu choi', async () => {
  const res = await postIpn({ ...basePayload(), signature: 'deadbeef' })
  assert.equal(res.status, 400)
})

test('sua so tien sau khi ky lam chu ky het hop le', async () => {
  const payload = basePayload()
  const signature = signPayload(payload)
  const res = await postIpn({ ...payload, amount: '1', signature })
  assert.equal(res.status, 400)
})

test('doi resultCode sau khi ky lam chu ky het hop le', async () => {
  const payload = { ...basePayload(), resultCode: 1 }
  const signature = signPayload(payload)
  // Ky luc that bai roi doi thanh thanh cong -> chu ky khong con khop.
  const res = await postIpn({ ...payload, resultCode: 0, signature })
  assert.equal(res.status, 400)
})

test('IPN ky dung di qua duoc buoc xac thuc', async () => {
  const payload = basePayload()
  const signature = signPayload(payload)
  const res = await postIpn({ ...payload, signature })
  // Khong co ban ghi payment nao khop requestId nay nen handler tra 200 de MoMo
  // ngung retry. Diem mau chot: khong con la 400, tuc da qua duoc cong chu ky.
  assert.equal(res.status, 200)
})
