import 'dotenv/config'
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS } from './helpers.mjs'
import { evaluateShipment, areaAnomalies, areaKey, SHIPPER_DEFAULTS, SHIPPER_RULES } from '../services/shipperFraud.service.js'

const run = promisify(execFile)
const BACKEND_DIR = fileURLToPath(new URL('..', import.meta.url))
after(() => prisma.$disconnect())

// --- Unit ---------------------------------------------------------------------

// 10:00 gio VN = 03:00Z
const vn = (h, m = 0, day = 1) => new Date(Date.UTC(2026, 10, day, h - 7, m))

test('evaluateShipment: giao binh thuong khong co tin hieu', () => {
  const r = evaluateShipment({
    status: 'delivered',
    cod_amount_vnd: 0,
    events: [{ status: 'in_transit', occurred_at: vn(9) }, { status: 'delivered', occurred_at: vn(14) }]
  })
  assert.deepEqual(r.reasons, [])
  assert.equal(r.score, 0)
})

test('evaluateShipment: giao qua nhanh, giao luc 23h, that bai luc 22h lap lai', () => {
  const r = evaluateShipment({
    status: 'delivered',
    cod_amount_vnd: 0,
    events: [
      { status: 'failed', occurred_at: vn(22) },
      { status: 'in_transit', occurred_at: vn(23, 0, 2) },
      { status: 'failed', occurred_at: vn(12, 0, 2) },
      { status: 'failed', occurred_at: vn(12, 0, 3) },
      { status: 'delivered', occurred_at: vn(23, 5, 2) }
    ]
  })
  assert.deepEqual(r.reasons.sort(), ['FAST_DELIVERY', 'ODD_HOUR_DELIVERY', 'ODD_HOUR_FAILED', 'REPEATED_FAILED'])
  assert.equal(r.score, 40 + 20 + 30 + 20)
  assert.equal(r.facts.transit_minutes, 5)
})

test('evaluateShipment: COD giu qua han chi khi chua doi soat', () => {
  const now = new Date('2026-12-01T00:00:00Z')
  const base = { status: 'delivered', cod_amount_vnd: 500000, cod_collected_at: new Date('2026-11-01T00:00:00Z'), events: [] }
  assert.ok(evaluateShipment(base, SHIPPER_DEFAULTS, now).reasons.includes('COD_NOT_REMITTED'))
  assert.deepEqual(evaluateShipment({ ...base, cod_settlement_id: 1n }, SHIPPER_DEFAULTS, now).reasons, [])
  const fresh = { ...base, cod_collected_at: new Date('2026-11-25T00:00:00Z') }
  assert.deepEqual(evaluateShipment(fresh, SHIPPER_DEFAULTS, now).reasons, [])
})

test('areaAnomalies: khu vuc that bai cao bat thuong so voi carrier', () => {
  const rows = []
  const add = (area, n, bad) => {
    for (let i = 0; i < n; i++) rows.push({ carrier: 'ghtk', area, status: i < bad ? 'failed' : 'delivered' })
  }
  add('ghtk|hanoi|badinh', 100, 5)
  add('ghtk|hanoi|caugiay', 100, 6)
  add('ghtk|hanoi|dongda', 20, 12) // 60% vs ~5%
  add('ghtk|hanoi|tayho', 5, 5) // qua it mau
  const hot = areaAnomalies(rows)
  assert.deepEqual([...hot.keys()], ['ghtk|hanoi|dongda'])
  assert.ok(hot.get('ghtk|hanoi|dongda').z >= 3)
  assert.equal(areaKey('ghtk', { province: 'Hà Nội', district: 'Đống Đa' }), 'ghtk|hanoi|dongda')
  assert.equal(areaKey('ghtk', { province: 'Hà Nội' }), null)
})

// --- API ----------------------------------------------------------------------

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const buyer = await login(ACCOUNTS.buyer)
const buyer2 = await login(ACCOUNTS.buyer2)

const placeAndShip = async () => {
  const list = await req('/shops/tech-world/products?limit=20')
  const p = [...(list.json?.products ?? [])].filter(x => !x.variants?.length).sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0]
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  const placed = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [{ product_id: p.id, quantity: 1, ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } }) }],
      shipping_address: { name: 'Fraud Test', phone: '0900000000', address: '1 Test', province: 'Ha Noi', district: 'Ba Dinh', ward: 'Phuc Xa' },
      payment_method: 'cod'
    }
  })
  assert.equal(placed.status, 201, JSON.stringify(placed.json).slice(0, 200))
  const order = placed.json.orders[0]
  const sh = await req(`/shipments/orders/${order.id}`, { method: 'POST', token: seller1 })
  assert.equal(sh.status, 201, JSON.stringify(sh.json))
  return { order, shipment: sh.json.data }
}

test('nguoi mua bao chua nhan hang -> flag SHIPPER_SUSPECT, job gop tin hieu giao qua nhanh', async () => {
  const { order, shipment } = await placeAndShip()
  const report = () => req(`/shipments/orders/${order.id}/not-received`, { method: 'POST', token: buyer, body: { note: 'Chua thay shipper goi' } })

  const early = await report()
  assert.equal(early.status, 409, 'chua giao thi chua bao duoc')

  const sim = status => req(`/shipments/${shipment.id}/simulate`, { method: 'POST', token: seller1, body: { status } })
  assert.equal((await sim('picked')).status, 200)
  assert.equal((await sim('delivered')).status, 200)

  const stranger = await req(`/shipments/orders/${order.id}/not-received`, { method: 'POST', token: buyer2 })
  assert.equal(stranger.status, 404)

  const first = await report()
  assert.equal(first.status, 201, JSON.stringify(first.json))
  const dup = await report()
  assert.equal(dup.status, 200, 'bao lai khong tao flag moi')

  const where = { type: 'SHIPPER_SUSPECT', subject: 'shipment', subject_id: BigInt(shipment.id) }
  let flag = await prisma.fraudFlag.findFirst({ where })
  assert.deepEqual(flag.reasons, ['BUYER_NOT_RECEIVED'])
  assert.equal(flag.score, 70)
  assert.equal(flag.details.buyer_note, 'Chua thay shipper goi')

  // picked -> delivered trong vai giay: job phai them FAST_DELIVERY vao cung flag
  const { stdout } = await run(process.execPath, ['jobs/scanShipperFraud.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, SHIPPER_AI_ENABLED: '0' }
  })
  assert.match(stdout, /shipper-fraud-scan\] \d+ shipment/)
  flag = await prisma.fraudFlag.findFirst({ where })
  assert.ok(flag.reasons.includes('FAST_DELIVERY'), JSON.stringify(flag.reasons))
  // simulate dung gio that: chay test ban dem se them ODD_HOUR_DELIVERY, nen
  // so diem phai bang tong cac ly do co mat thay vi mot hang so co dinh
  assert.equal(flag.score, flag.reasons.reduce((n, r) => n + SHIPPER_RULES[r], 0), JSON.stringify(flag.reasons))
  assert.ok(flag.score >= 110)
  assert.equal(flag.details.buyer_note, 'Chua thay shipper goi', 'gop khong lam mat ghi chu')

  const list = await req('/fraud/flags?type=SHIPPER_SUSPECT&limit=50', { token: admin })
  assert.equal(list.status, 200)
  const row = list.json.data.find(f => String(f.subject_id) === String(shipment.id))
  assert.equal(row.subject_info.tracking_code, shipment.tracking_code)
  assert.equal(row.subject_info.order.order_number, order.order_number)

  // Admin da dismiss -> bao lai khong mo lai flag
  assert.equal((await req(`/fraud/flags/${row.id}`, { method: 'PATCH', token: admin, body: { status: 'dismissed' } })).status, 200)
  assert.equal((await report()).status, 200)
  assert.equal((await prisma.fraudFlag.findFirst({ where })).status, 'dismissed')
})
