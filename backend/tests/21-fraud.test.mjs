import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { assessCheckoutRisk, recordCheckoutRisk } from '../services/fraud.service.js'

const admin = await login(ACCOUNTS.admin)
const jane = await login(ACCOUNTS.buyer)
const john = await login(ACCOUNTS.buyer2)

const users = {
  jane: await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer } }),
  john: await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer2 } })
}
const original = Object.fromEntries(
  Object.entries(users).map(([k, u]) => [k, { phone: u.phone, phone_verified_at: u.phone_verified_at }])
)

const PHONE = '0912345601'
const clearOtps = () =>
  prisma.otpCode.deleteMany({ where: { user_id: { in: [users.jane.id, users.john.id] } } })
const sendOtp = (token, phone = PHONE) =>
  req('/auth/phone/otp', { method: 'POST', token, body: { phone } })

const created = { groups: [], coupons: [], flags: [] }
let settingBackup // undefined = chua dong, null = khong ton tai truoc do

after(async () => {
  await clearOtps()
  for (const k of ['jane', 'john']) {
    await prisma.user.update({ where: { id: users[k].id }, data: original[k] })
  }
  await prisma.fraudFlag.deleteMany({ where: { id: { in: created.flags } } })
  await prisma.fraudFlag.deleteMany({
    where: { subject: 'order_group', subject_id: { in: created.groups } }
  })
  await prisma.orderGroup.deleteMany({ where: { id: { in: created.groups } } })
  await prisma.coupon.deleteMany({ where: { id: { in: created.coupons } } })
  if (settingBackup !== undefined) await restoreCodSetting()
  await prisma.$disconnect()
})

const setCodSetting = async value => {
  if (settingBackup === undefined) {
    settingBackup = await prisma.setting.findUnique({ where: { key: 'cod_require_verified_phone' } })
  }
  await prisma.setting.upsert({
    where: { key: 'cod_require_verified_phone' },
    update: { value, deleted_at: null },
    create: { key: 'cod_require_verified_phone', value, category: 'fraud', data_type: 'boolean' }
  })
}
const restoreCodSetting = async () => {
  if (settingBackup) {
    await prisma.setting.update({
      where: { key: 'cod_require_verified_phone' },
      data: { value: settingBackup.value, deleted_at: settingBackup.deleted_at }
    })
  } else {
    await prisma.setting.deleteMany({ where: { key: 'cod_require_verified_phone' } })
  }
}

test('OTP: invalid phone rejected, send honours 60s cooldown', async () => {
  await clearOtps()
  const bad = await sendOtp(jane, '12345')
  assert.equal(bad.status, 400)

  const ok = await sendOtp(jane)
  assert.equal(ok.status, 200, JSON.stringify(ok.json))
  assert.match(ok.json.data.dev_code, /^\d{6}$/)

  const again = await sendOtp(jane)
  assert.equal(again.status, 429, 'cooldown')
})

test('OTP: 5 wrong attempts lock the code, even the right one', async () => {
  await clearOtps()
  const code = (await sendOtp(jane)).json.data.dev_code
  const wrong = code === '000000' ? '111111' : '000000'
  for (let i = 0; i < 5; i++) {
    const r = await req('/auth/phone/verify', { method: 'POST', token: jane, body: { phone: PHONE, code: wrong } })
    assert.equal(r.status, 400)
  }
  const locked = await req('/auth/phone/verify', { method: 'POST', token: jane, body: { phone: PHONE, code } })
  assert.equal(locked.status, 429)
})

test('OTP: happy path verifies phone (+84 format accepted) and exposes phone_verified', async () => {
  await clearOtps()
  const sent = await sendOtp(jane, '+84912345601')
  assert.equal(sent.json.data.phone, PHONE, 'normalized')
  const v = await req('/auth/phone/verify', {
    method: 'POST',
    token: jane,
    body: { phone: PHONE, code: sent.json.data.dev_code }
  })
  assert.equal(v.status, 200, JSON.stringify(v.json))
  const me = await req('/auth/me', { token: jane })
  assert.equal(me.json.data.phone, PHONE)
  assert.equal(me.json.data.phone_verified, true)
})

test('OTP: a phone verified by another account gives 409', async () => {
  await clearOtps()
  const r = await sendOtp(john)
  assert.equal(r.status, 409)
})

test('changing phone in profile clears phone_verified', async () => {
  const r = await req('/auth/update_profile', { method: 'PATCH', token: jane, body: { phone: '0987654321' } })
  assert.equal(r.status, 200)
  assert.equal(r.json.data.phone_verified, false)
})

const orderBody = (p, extra = {}) => ({
  items: [{ product_id: p.id, quantity: 1, color: p.available_colors?.[0] || null }],
  shipping_address: {
    name: 'Fraud Test',
    phone: '0911222333',
    address: '12 Nguyen Hue Street, Ben Nghe Ward, District 1, Ho Chi Minh City'
  },
  payment_method: 'cod',
  ...extra
})

test('cod_require_verified_phone blocks unverified buyer on COD', async () => {
  const p = await firstProductOf('gadget-hub')
  await setCodSetting('true')
  try {
    const r = await req('/orders', { method: 'POST', token: jane, body: orderBody(p) })
    assert.equal(r.status, 403)
    assert.equal(r.json.code, 'PHONE_VERIFICATION_REQUIRED')
  } finally {
    await restoreCodSetting()
    settingBackup = undefined
  }
})

test('coupon reuse by another account with the same receiver phone is blocked; IP alone is not', async () => {
  const p = await firstProductOf('gadget-hub')
  const coupon = await prisma.coupon.create({
    data: {
      code: `FRAUD${Date.now()}`,
      discount_type: 'percent',
      discount_value: 10,
      usage_limit: 10
    }
  })
  created.coupons.push(coupon.id)
  // Don truoc cua jane dung coupon (chen thang DB de khong dong den ton kho)
  const g = await prisma.orderGroup.create({
    data: {
      user_id: users.jane.id,
      group_number: `FRAUDT-${Date.now()}`,
      subtotal_amount: 10,
      total_amount: 10,
      coupon_id: coupon.id,
      receiver_phone: '0911222333',
      client_ip: '::1',
      device_id: 'dev-A',
      shipping_address: { address: '99 Le Loi Street, District 3, Ho Chi Minh City' }
    }
  })
  created.groups.push(g.id)

  const blocked = await req('/orders', {
    method: 'POST',
    token: john,
    body: orderBody(p, { coupon_code: coupon.code })
  })
  assert.equal(blocked.status, 403, JSON.stringify(blocked.json))
  assert.equal(blocked.json.code, 'COUPON_ABUSE')

  const base = {
    userId: users.john.id,
    paymentMethod: 'cod',
    coupon,
    finalAmount: 10,
    shopOwnerIds: []
  }
  const ipOnly = await assessCheckoutRisk({
    ...base,
    receiverPhone: '0933444555',
    address: { address: '5 Tran Hung Dao Street, District 5, Ho Chi Minh City' },
    clientIp: '::1',
    deviceId: 'dev-B'
  })
  assert.equal(ipOnly.couponBlocked, false)
  assert.equal(ipOnly.block, false)
  assert.ok(ipOnly.score > 0 && ipOnly.reasons.includes('COUPON_SHARED_IP'))

  const dev = await assessCheckoutRisk({ ...base, receiverPhone: '0933444555', clientIp: '::2', deviceId: 'dev-A' })
  assert.equal(dev.couponBlocked, true)
  const addr = await assessCheckoutRisk({
    ...base,
    receiverPhone: '0933444555',
    address: { address: '99 le loi street, DISTRICT 3, ho chi minh city' },
    clientIp: '::2'
  })
  assert.equal(addr.couponBlocked, true)
})

test('self-dealing (receiver phone == shop owner phone) is flagged and recorded once', async () => {
  const seller = await prisma.user.findUnique({ where: { email: ACCOUNTS.seller1 } })
  const phone = seller.phone && seller.phone.replace(/\D/g, '').length >= 9 ? seller.phone : null
  if (!phone) return // seed khong co SDT chu shop: khong the dung kich ban nay
  const ctx = {
    userId: users.john.id,
    paymentMethod: 'cod',
    receiverPhone: phone,
    finalAmount: 10,
    shopOwnerIds: [seller.id]
  }
  const risk = await assessCheckoutRisk(ctx)
  assert.ok(risk.reasons.includes('SELF_DEALING_PHONE'))
  assert.equal(risk.flag, true)

  const g = await prisma.orderGroup.create({
    data: { user_id: users.john.id, group_number: `FRAUDS-${Date.now()}`, subtotal_amount: 1, total_amount: 1 }
  })
  created.groups.push(g.id)
  await recordCheckoutRisk(g, risk, ctx)
  await recordCheckoutRisk(g, risk, ctx)
  const flags = await prisma.fraudFlag.findMany({ where: { subject: 'order_group', subject_id: g.id } })
  assert.equal(flags.length, 1)
  assert.equal(flags[0].type, 'SELF_DEALING')
})

test('admin lists, filters, resolves flags and reads stats', async () => {
  const g = created.groups[0]
  const flag = await prisma.fraudFlag.create({
    data: { type: 'ORDER_RISK', subject: 'order_group', subject_id: g, score: 50, reasons: ['VELOCITY'] }
  })
  created.flags.push(flag.id)

  const list = await req('/fraud/flags?type=ORDER_RISK&status=open&limit=100', { token: admin })
  assert.equal(list.status, 200)
  const row = list.json.data.find(f => String(f.id) === String(flag.id))
  assert.ok(row, 'flag listed')
  assert.ok(row.subject_info?.group_number, 'subject info attached')
  assert.ok(list.json.pagination.total_count >= 1)

  assert.equal((await req('/fraud/flags', { token: jane })).status, 403)
  assert.equal((await req(`/fraud/flags/${flag.id}`, { method: 'PATCH', token: admin, body: { status: 'nope' } })).status, 400)

  const res = await req(`/fraud/flags/${flag.id}`, { method: 'PATCH', token: admin, body: { status: 'dismissed' } })
  assert.equal(res.status, 200)
  assert.equal(res.json.data.status, 'dismissed')
  assert.ok(res.json.data.resolved_at)

  const stats = await req('/fraud/stats', { token: admin })
  assert.equal(stats.status, 200)
  assert.ok(stats.json.data.by_type.ORDER_RISK.dismissed >= 1)
})
