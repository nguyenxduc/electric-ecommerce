// Duong bien chua co test o cac tinh nang van hanh: phi ship theo carrier, webhook
// that, PATCH bien the, job het han chay bang tien trinh that, REFUND_OWED mot phan, OTP.
// Moi test tra lai DB/setting da doi (after) vi chay chung DB voi cac file khac.
import 'dotenv/config'
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const run = promisify(execFile)
const BACKEND_DIR = fileURLToPath(new URL('..', import.meta.url))
const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const jane = await login(ACCOUNTS.buyer)
const john = await login(ACCOUNTS.buyer2)
const tag = Date.now().toString(36)
const RATE = Number(process.env.USD_TO_VND_RATE || 25000)
const usd = vnd => Math.round((vnd / RATE) * 100) / 100

const users = {
  jane: await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer } }),
  john: await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer2 } })
}
const userBackup = Object.fromEntries(
  Object.entries(users).map(([k, u]) => [k, { phone: u.phone, phone_verified_at: u.phone_verified_at }])
)
const twShop = await prisma.shop.findUnique({ where: { slug: 'tech-world' } })
const ghShop = await prisma.shop.findUnique({ where: { slug: 'gadget-hub' } })
const shopBackup = {
  pickup_province: twShop.pickup_province,
  pickup_district: twShop.pickup_district,
  pickup_ward: twShop.pickup_ward,
  pickup_address: twShop.pickup_address
}

// --- Don dep ------------------------------------------------------------------
const settingBackup = new Map() // key -> row | null
const orderIds = new Set()
const productIds = []
const paymentIds = []

const setSetting = async (key, value) => {
  if (!settingBackup.has(key)) {
    settingBackup.set(key, await prisma.setting.findUnique({ where: { key } }))
  }
  const r = await req('/settings', { method: 'POST', token: admin, body: { key, value } })
  assert.equal(r.status, 200, `set ${key}: ${JSON.stringify(r.json)}`)
}

const cancelAll = async () => {
  for (const id of orderIds) {
    for (const t of [jane, john]) await req(`/orders/${id}/cancel`, { method: 'PATCH', token: t })
  }
}

after(async () => {
  await cancelAll()
  for (const [key, row] of settingBackup) {
    if (row) {
      await prisma.setting.update({
        where: { key },
        data: { value: row.value, data_type: row.data_type, category: row.category, deleted_at: row.deleted_at }
      })
    } else {
      await prisma.setting.deleteMany({ where: { key } })
    }
  }
  await prisma.shop.update({ where: { id: twShop.id }, data: shopBackup })
  for (const k of ['jane', 'john']) {
    await prisma.user.update({ where: { id: users[k].id }, data: userBackup[k] })
  }
  await prisma.otpCode.deleteMany({ where: { user_id: { in: [users.jane.id, users.john.id] } } })
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } })
  for (const id of productIds) {
    await prisma.cartItem.deleteMany({ where: { product_id: id } })
    await prisma.product.update({ where: { id }, data: { deleted_at: new Date() } })
  }
  await prisma.$disconnect()
})

const orderableItem = async (slug = 'tech-world', sort = 'price-asc') => {
  const p = await firstProductOf(slug, sort)
  assert.ok(p && p.quantity >= 3, `${slug} khong co san pham de dat`)
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  return {
    product_id: p.id,
    quantity: 1,
    ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } })
  }
}

const placeOrder = async (token, items, address, payment_method = 'cod') => {
  const r = await req('/orders', {
    method: 'POST',
    token,
    body: { items, shipping_address: address, payment_method }
  })
  for (const o of r.json?.orders ?? []) orderIds.add(o.id)
  return r
}

const baseAddr = { name: 'Edge Test', phone: '0900000024', address: '1 Edge St' }

// --- 1. shipping_rate_mode=carrier --------------------------------------------

test('carrier: quote == shipping_fee cua don; cung tinh re hon khac tinh', async () => {
  await setSetting('shipping_rate_mode', 'carrier')
  await setSetting('shipping_provider', 'mock')
  await setSetting('free_shipping_threshold', '100000') // dam bao khong bi mien phi
  const pick = await req('/shops/me', { method: 'PATCH', token: seller1, body: { pickup_province: 'Ha Noi', pickup_address: '1 Kho' } })
  assert.equal(pick.status, 200, JSON.stringify(pick.json))

  const item = await orderableItem()
  const weight = (await prisma.product.findUnique({ where: { id: BigInt(item.product_id) } })).weight_grams
  const steps = Math.max(0, Math.ceil(Math.max(weight, 1) / 500) - 1)

  for (const [province, base] of [['Ha Noi', 15000], ['TP Ho Chi Minh', 30000]]) {
    const addr = { ...baseAddr, province }
    const q = await req('/shipping/quote', { method: 'POST', token: jane, body: { items: [item], shipping_address: addr } })
    assert.equal(q.status, 200, JSON.stringify(q.json))
    const expected = usd(base + steps * 5000)
    assert.equal(q.json.data.total, expected, `${province} quote`)

    // Chi dat don cho tinh khac tinh: moi don them diem velocity gian lan
    if (base === 30000) {
      const placed = await placeOrder(jane, [item], addr)
      assert.equal(placed.status, 201, JSON.stringify(placed.json).slice(0, 300))
      assert.equal(Number(placed.json.orders[0].shipping_fee), q.json.data.total, `${province} order fee`)
    }
  }
})

test('carrier: tren nguong mien phi thi phi = 0 (ca quote lan don)', async () => {
  await setSetting('free_shipping_threshold', '0.01')
  const item = await orderableItem()
  const addr = { ...baseAddr, province: 'TP Ho Chi Minh' }
  const q = await req('/shipping/quote', { method: 'POST', token: jane, body: { items: [item], shipping_address: addr } })
  assert.equal(q.json.data.total, 0)
  const placed = await placeOrder(john, [item], addr)
  assert.equal(placed.status, 201)
  assert.equal(Number(placed.json.orders[0].shipping_fee), 0)
})

test('carrier: thieu tinh nguoi mua hoac tinh lay hang thi roi ve phi co dinh', async () => {
  await setSetting('free_shipping_threshold', '100000')
  const flat = Number((await prisma.setting.findUnique({ where: { key: 'shipping_fee' } }))?.value ?? 9.99)
  const item = await orderableItem()

  const noProvince = await req('/shipping/quote', { method: 'POST', token: jane, body: { items: [item], shipping_address: baseAddr } })
  assert.equal(noProvince.json.data.total, flat)
  const strAddr = await req('/shipping/quote', { method: 'POST', token: jane, body: { items: [item], shipping_address: 'so 1 duong A' } })
  assert.equal(strAddr.json.data.total, flat, 'dia chi dang chuoi')

  await prisma.shop.update({ where: { id: twShop.id }, data: { pickup_province: null } })
  const noPickup = await req('/shipping/quote', {
    method: 'POST', token: jane, body: { items: [item], shipping_address: { ...baseAddr, province: 'Ha Noi' } }
  })
  assert.equal(noPickup.json.data.total, flat, 'shop chua khai bao tinh lay hang')
  await prisma.shop.update({ where: { id: twShop.id }, data: { pickup_province: 'Ha Noi' } })
})

// --- 2. webhook voi token that -------------------------------------------------

const WEBHOOK_SECRET = process.env.SHIPPING_WEBHOOK_SECRET_MOCK || process.env.SHIPPING_WEBHOOK_SECRET

const shipOrder = async () => {
  const placed = await placeOrder(john, [await orderableItem()], { ...baseAddr, province: 'Ha Noi' })
  assert.equal(placed.status, 201, JSON.stringify(placed.json).slice(0, 300))
  const order = placed.json.orders[0]
  const s = await req(`/shipments/orders/${order.id}`, { method: 'POST', token: seller1 })
  assert.equal(s.status, 201, JSON.stringify(s.json))
  return { order, shipment: s.json.data }
}
const hook = (body, { header, query } = {}) =>
  fetch(`${process.env.API_URL || 'http://localhost:3000/api'}/shipments/webhook/mock${query ? `?token=${query}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(header && { 'x-webhook-token': header }) },
    body: JSON.stringify(body)
  }).then(async r => ({ status: r.status, json: await r.json().catch(() => null) }))
const orderStatus = async id => (await req(`/orders/${id}`, { token: john })).json.status

test('webhook: token dung qua header va query, idempotent, su kien den tre bi bo qua', async () => {
  assert.ok(WEBHOOK_SECRET, 'thieu SHIPPING_WEBHOOK_SECRET_MOCK trong backend/.env')
  const probe = await hook({}, { header: WEBHOOK_SECRET })
  assert.equal(probe.status, 200, 'server chua nap secret: khoi dong lai dev server')

  const { order, shipment } = await shipOrder()
  const code = shipment.tracking_code

  // header: picked -> in_transit, don shipped; gui lai khong doi gi
  const a = await hook({ tracking_code: code, status: 'picked' }, { header: WEBHOOK_SECRET })
  assert.deepEqual([a.status, a.json.changed], [200, true])
  assert.equal(await orderStatus(order.id), 'shipped')
  const again = await hook({ tracking_code: code, status: 'picked' }, { header: WEBHOOK_SECRET })
  assert.equal(again.json.changed, false)

  // su kien tre: picking sau in_transit khong keo lui van don
  const late = await hook({ tracking_code: code, status: 'picking' }, { header: WEBHOOK_SECRET })
  assert.equal(late.json.changed, false)
  const view = (await req(`/shipments/orders/${order.id}`, { token: john })).json.data
  assert.equal(view.status, 'in_transit')
  assert.deepEqual(view.events.map(e => e.status), ['created', 'in_transit'])

  // query token: returned -> huy don; gui lai va su kien sau trang thai cuoi deu bi bo qua
  const ret = await hook({ tracking_code: code, status: 'returned' }, { query: WEBHOOK_SECRET })
  assert.deepEqual([ret.status, ret.json.changed], [200, true])
  assert.equal(await orderStatus(order.id), 'cancelled')
  const retAgain = await hook({ tracking_code: code, status: 'returned' }, { query: WEBHOOK_SECRET })
  assert.equal(retAgain.json.changed, false)
  const afterFinal = await hook({ tracking_code: code, status: 'picked' }, { query: WEBHOOK_SECRET })
  assert.equal(afterFinal.json.changed, false)
  assert.equal(await orderStatus(order.id), 'cancelled')
})

test('webhook: token sai/thieu bi 401; ma van don la thi ignored', async () => {
  assert.equal((await hook({}, { header: 'x'.repeat(WEBHOOK_SECRET.length) })).status, 401)
  assert.equal((await hook({}, { query: 'short' })).status, 401)
  const unknown = await hook({ tracking_code: 'NOPE-0', status: 'delivered' }, { header: WEBHOOK_SECRET })
  assert.deepEqual([unknown.status, unknown.json.ignored], [200, true])
})

// --- 3. PATCH san pham voi bien the --------------------------------------------

const category = await prisma.category.findFirst({ where: { deleted_at: null } })
const createdProduct = await req('/products', {
  method: 'POST',
  token: seller1,
  body: {
    name: `Edge Variant ${tag}`,
    price: 100,
    discount: 10,
    description: 'edge',
    category_id: category.id.toString(),
    variants: [
      { sku: `E-A-${tag}`, name: 'A', price_delta: 0, quantity: 4 },
      { sku: `E-B-${tag}`, name: 'B', price_delta: -50, quantity: 2 }
    ]
  }
})
assert.ok([200, 201].includes(createdProduct.status), JSON.stringify(createdProduct.json))
const pid = BigInt(createdProduct.json.product.id)
productIds.push(pid)
const [vA, vB] = await prisma.productVariant.findMany({ where: { product_id: pid }, orderBy: { id: 'asc' } })
const patch = body => req(`/products/${pid}`, { method: 'PATCH', token: seller1, body })
const activeVariants = () => prisma.productVariant.findMany({ where: { product_id: pid, deleted_at: null }, orderBy: { id: 'asc' } })
const qty = async () => (await prisma.product.findUnique({ where: { id: pid } })).quantity

test('PATCH bien the: sua, them moi, bo bien the thi xoa mem; quantity = tong, bo qua quantity gui kem', async () => {
  const r = await patch({
    quantity: 999,
    variants: [
      { id: vA.id.toString(), sku: vA.sku, name: 'A2', price_delta: 5, quantity: 7 },
      { sku: `E-C-${tag}`, name: 'C', price_delta: 0, quantity: 1 }
    ]
  })
  assert.equal(r.status, 200, JSON.stringify(r.json))
  const act = await activeVariants()
  assert.deepEqual(act.map(v => [v.name, v.quantity]), [['A2', 7], ['C', 1]])
  assert.equal(await qty(), 8)
  const gone = await prisma.productVariant.findUnique({ where: { id: vB.id } })
  assert.ok(gone.deleted_at, 'B bi xoa mem')
  assert.notEqual(gone.sku, vB.sku, 'sku cu duoc giai phong')

  const detail = (await req(`/products/${pid}`)).json
  const vs = (detail?.data ?? detail).variants
  assert.equal(vs.length, 2)
  assert.equal((detail?.data ?? detail).quantity, 8)
})

test('PATCH bien the: dung lai sku cua bien the da xoa duoc; trung sku dang dung -> 409; id la -> 400', async () => {
  const [a] = await activeVariants()
  const reuse = await patch({
    variants: [
      { id: a.id.toString(), sku: a.sku, name: 'A2', quantity: 7 },
      { sku: vB.sku, name: 'B again', price_delta: -50, quantity: 3 }
    ]
  })
  assert.equal(reuse.status, 200, JSON.stringify(reuse.json))
  assert.equal(await qty(), 10)

  const dup = await patch({ variants: [{ id: a.id.toString(), sku: a.sku, name: 'A2', quantity: 7 }, { sku: a.sku, name: 'dup', quantity: 1 }] })
  assert.equal(dup.status, 400, 'trung sku ngay trong payload')

  const other = await prisma.productVariant.findFirst({ where: { product_id: { not: pid }, deleted_at: null } })
  const foreignSku = await patch({
    variants: [{ id: a.id.toString(), sku: other.sku, name: 'steal', quantity: 1 }]
  })
  assert.equal(foreignSku.status, 409, 'sku dang thuoc san pham khac')
  const foreignId = await patch({ variants: [{ id: other.id.toString(), sku: `F-${tag}`, name: 'x', quantity: 1 }] })
  assert.equal(foreignId.status, 400)
  assert.equal(await qty(), 10, 'giao dich loi khong de lai thay doi')
})

test('PATCH bien the: chi doi discount/price lam gia hieu dung <= 0 -> 400, gia tri cu giu nguyen', async () => {
  // bien the B (delta -50, sku tai su dung): gia hieu dung = 100 - 10 - 50 = 40
  const before = await prisma.product.findUnique({ where: { id: pid } })
  const d = await patch({ discount: 60 })
  assert.equal(d.status, 400, JSON.stringify(d.json))
  const p = await patch({ price: 55 })
  assert.equal(p.status, 400, 'price giam cung dua gia bien the ve <= 0')
  const after = await prisma.product.findUnique({ where: { id: pid } })
  assert.equal(Number(after.discount), Number(before.discount))
  assert.equal(Number(after.price), Number(before.price))
  const ok = await patch({ discount: 20 })
  assert.equal(ok.status, 200, JSON.stringify(ok.json))
})

// --- 4. job het han chay bang tien trinh that + REFUND_OWED mot phan -------------

const momoSign = p => {
  const f = v => (v == null ? '' : String(v))
  const secret = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
  const access = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85'
  return crypto
    .createHmac('sha256', secret)
    .update(
      `accessKey=${access}&amount=${f(p.amount)}&extraData=${f(p.extraData)}&message=${f(p.message)}` +
        `&orderId=${f(p.orderId)}&orderInfo=${f(p.orderInfo)}&orderType=${f(p.orderType)}&partnerCode=${f(p.partnerCode)}` +
        `&payType=${f(p.payType)}&requestId=${f(p.requestId)}&responseTime=${f(p.responseTime)}` +
        `&resultCode=${f(p.resultCode)}&transId=${f(p.transId)}`
    )
    .digest('hex')
}
const stockOf = async id => (await prisma.product.findUnique({ where: { id: BigInt(id) } })).quantity

test('job expire-unpaid-orders (tien trinh that): huy don momo qua han va tra kho', async () => {
  const item = await orderableItem('tech-world', 'price-desc')
  const before = await stockOf(item.product_id)
  const placed = await placeOrder(jane, [item], { ...baseAddr, province: 'Ha Noi' }, 'momo')
  assert.equal(placed.status, 201, JSON.stringify(placed.json).slice(0, 300))
  const id = BigInt(placed.json.orders[0].id)
  assert.equal(await stockOf(item.product_id), before - 1)

  // chua qua han: job khong dong vao
  await run(process.execPath, ['jobs/expireUnpaidOrders.js'], { cwd: BACKEND_DIR })
  assert.equal((await prisma.order.findUnique({ where: { id } })).status, 'pending')

  await prisma.order.update({ where: { id }, data: { created_at: new Date(Date.now() - 3 * 3600 * 1000) } })
  const { stdout } = await run(process.execPath, ['jobs/expireUnpaidOrders.js'], { cwd: BACKEND_DIR })
  assert.match(stdout, /cancelled \d+ order/)
  assert.equal((await prisma.order.findUnique({ where: { id } })).status, 'cancelled')
  assert.equal(await stockOf(item.product_id), before, 'kho duoc tra')
})

test('IPN tre sau khi chi huy mot don con: REFUND_OWED dung bang so tien don da huy', async () => {
  const [i1, i2] = [await orderableItem('tech-world'), await orderableItem('gadget-hub')]
  const placed = await placeOrder(jane, [i1, i2], { ...baseAddr, province: 'Ha Noi' }, 'momo')
  assert.equal(placed.status, 201, JSON.stringify(placed.json).slice(0, 300))
  assert.equal(placed.json.orders.length, 2)
  const [oA, oB] = placed.json.orders
  const rows = await prisma.order.findMany({ where: { id: { in: [BigInt(oA.id), BigInt(oB.id)] } } })
  const groupId = rows[0].order_group_id
  const totalA = Number(rows.find(r => r.id === BigInt(oA.id)).total_amount)
  const totalB = Number(rows.find(r => r.id === BigInt(oB.id)).total_amount)

  const payment = await prisma.payment.create({
    data: {
      order_group_id: groupId, provider: 'momo', amount: totalA + totalB, currency: 'USD', status: 'pending',
      momo_order_id: `EDGE${tag}`, momo_request_id: `EDGER${tag}`
    }
  })
  paymentIds.push(payment.id)

  const cancel = await req(`/orders/${oA.id}/cancel`, { method: 'PATCH', token: jane })
  assert.equal(cancel.status, 200, JSON.stringify(cancel.json))
  // huy mot don con lam payment pending bi huy; dua ve pending nhu luc cong thanh toan dang xu ly
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'pending' } })

  const p = {
    partnerCode: 'MOMO', orderId: payment.momo_order_id, requestId: payment.momo_request_id,
    amount: String(payment.amount), orderInfo: 'edge', orderType: 'momo_wallet', transId: '9001',
    resultCode: 0, message: 'Successful.', payType: 'qr', responseTime: '1700000000000', extraData: ''
  }
  p.signature = momoSign(p)
  const ipn = await req('/payments/momo-ipn', { method: 'POST', body: p })
  assert.equal(ipn.status, 200)
  assert.equal((await prisma.payment.findUnique({ where: { id: payment.id } })).status, 'paid')
  assert.equal((await prisma.order.findUnique({ where: { id: BigInt(oA.id) } })).status, 'cancelled', 'don da huy khong hoi sinh')
  assert.equal((await prisma.order.findUnique({ where: { id: BigInt(oB.id) } })).status, 'processing')

  await new Promise(r => setTimeout(r, 400))
  const log = await prisma.auditLog.findFirst({
    where: { action: 'REFUND_OWED', resource: 'order_group', resource_id: groupId },
    orderBy: { id: 'desc' }
  })
  assert.ok(log, 'thieu audit REFUND_OWED')
  assert.equal(Number(log.metadata.amount), Math.round(totalA * 100) / 100)

  // callback phat lai khong ghi them no hoan tien
  const replay = { ...p, transId: '9002' }
  replay.signature = momoSign(replay)
  await req('/payments/momo-ipn', { method: 'POST', body: replay })
  await new Promise(r => setTimeout(r, 300))
  const logs = await prisma.auditLog.count({ where: { action: 'REFUND_OWED', resource: 'order_group', resource_id: groupId } })
  assert.equal(logs, 1)
})

// --- 5. OTP --------------------------------------------------------------------

const OTP_PHONE = '0912345690'
const clearOtps = () => prisma.otpCode.deleteMany({ where: { user_id: { in: [users.jane.id, users.john.id] } } })
const sendOtp = (token, phone = OTP_PHONE) => req('/auth/phone/otp', { method: 'POST', token, body: { phone } })
const verify = (token, code, phone = OTP_PHONE) => req('/auth/phone/verify', { method: 'POST', token, body: { phone, code } })

test('OTP: ma het han bi tu choi du dung ma', async () => {
  await clearOtps()
  const code = (await sendOtp(jane)).json.data.dev_code
  assert.ok(code)
  await prisma.otpCode.updateMany({ where: { user_id: users.jane.id }, data: { expires_at: new Date(Date.now() - 1000) } })
  const r = await verify(jane, code)
  assert.equal(r.status, 400, JSON.stringify(r.json))
  const me = await req('/auth/me', { token: jane })
  assert.notEqual(me.json.data.phone, OTP_PHONE)
})

test('OTP: ma da dung khong dung lai duoc', async () => {
  await clearOtps()
  const code = (await sendOtp(jane)).json.data.dev_code
  const first = await verify(jane, code)
  assert.equal(first.status, 200, JSON.stringify(first.json))
  const reuse = await verify(jane, code)
  assert.equal(reuse.status, 400, 'ma da consumed')
})

test('OTP: SDT bi tai khoan khac xac minh trong luc cho -> 409 luc verify, khong gan SDT', async () => {
  await clearOtps()
  await prisma.user.update({ where: { id: users.jane.id }, data: { phone: '0900000001', phone_verified_at: null } })
  await prisma.user.update({ where: { id: users.john.id }, data: { phone: '0900000002', phone_verified_at: null } })
  const code = (await sendOtp(john)).json.data.dev_code
  assert.ok(code, 'john chua bi chan luc gui')

  // jane xac minh cung SDT truoc
  await prisma.user.update({ where: { id: users.jane.id }, data: { phone: OTP_PHONE, phone_verified_at: new Date() } })
  const r = await verify(john, code)
  assert.equal(r.status, 409, JSON.stringify(r.json))
  const j = await prisma.user.findUnique({ where: { id: users.john.id } })
  assert.equal(j.phone_verified_at, null)
  assert.notEqual(j.phone, OTP_PHONE)
})
