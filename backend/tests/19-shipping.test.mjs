import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'
import { mockFeeVnd, mockMapStatus } from '../services/shipping/providers/mock.js'
import { ghnMapStatus } from '../services/shipping/providers/ghn.js'
import { ghtkMapStatus } from '../services/shipping/providers/ghtk.js'

// --- Unit: khong can server ---------------------------------------------------

test('mock fee: cung tinh re hon khac tinh, cong them moi 500g', () => {
  const hn = { province: 'Ha Noi' }
  const hcm = { province: 'TP Ho Chi Minh' }
  assert.equal(mockFeeVnd({ from: hn, to: { province: 'Thành phố Hà Nội' }, weightGrams: 500 }), 15000)
  assert.equal(mockFeeVnd({ from: hn, to: hcm, weightGrams: 500 }), 30000)
  assert.equal(mockFeeVnd({ from: hn, to: hcm, weightGrams: 501 }), 35000)
  assert.equal(mockFeeVnd({ from: hn, to: hn, weightGrams: 1500 }), 25000)
})

test('status mapping GHN/GHTK/mock', () => {
  assert.equal(ghnMapStatus('picked'), 'in_transit')
  assert.equal(ghnMapStatus('delivered'), 'delivered')
  assert.equal(ghnMapStatus('delivery_fail'), 'failed')
  assert.equal(ghnMapStatus('cancel'), 'cancelled')
  assert.equal(ghnMapStatus('???'), null)
  assert.equal(ghtkMapStatus(5), 'delivered')
  assert.equal(ghtkMapStatus(-1), 'cancelled')
  assert.equal(mockMapStatus('picked'), 'in_transit')
})

// --- API ----------------------------------------------------------------------

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const seller2 = await login(ACCOUNTS.seller2)
const buyer = await login(ACCOUNTS.buyer)

const orderableItem = async () => {
  const list = await req('/shops/tech-world/products?limit=20')
  const p = [...(list.json?.products ?? [])].filter(x => !(x.variants?.length)).sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0]
  assert.ok(p && p.quantity >= 1, 'tech-world het hang')
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  return {
    product_id: p.id,
    quantity: 1,
    ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } })
  }
}

let order
let shipment

test('quote endpoint trung voi phi checkout o che do flat', async () => {
  const item = await orderableItem()
  const q = await req('/shipping/quote', {
    method: 'POST',
    token: buyer,
    body: { items: [item], shipping_address: { name: 'T', phone: '0900000000', address: 'HN' } }
  })
  assert.equal(q.status, 200, JSON.stringify(q.json))
  assert.equal(q.json.data.shops.length, 1)
  assert.equal(q.json.data.total, q.json.data.shops[0].shipping)
  const noAuth = await req('/shipping/quote', { method: 'POST', body: { items: [item] } })
  assert.equal(noAuth.status, 401)
})

test('seller tao van don cho don COD, don chuyen sang processing', async () => {
  const placed = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [await orderableItem()],
      shipping_address: { name: 'Ship Test', phone: '0900000000', address: '1 Test', province: 'Ha Noi', district: 'Ba Dinh', ward: 'Phuc Xa' },
      payment_method: 'cod'
    }
  })
  assert.equal(placed.status, 201, JSON.stringify(placed.json).slice(0, 200))
  order = placed.json.orders[0]

  // seller shop khac khong duoc tao
  const other = await req(`/shipments/orders/${order.id}`, { method: 'POST', token: seller2 })
  assert.equal(other.status, 403)

  const res = await req(`/shipments/orders/${order.id}`, { method: 'POST', token: seller1 })
  assert.equal(res.status, 201, JSON.stringify(res.json))
  shipment = res.json.data
  assert.equal(shipment.carrier, 'mock')
  assert.match(shipment.tracking_code, /^MOCK/)
  assert.ok(shipment.cod_amount_vnd > 0)
  assert.equal(shipment.events[0].status, 'created')

  const again = await req(`/shipments/orders/${order.id}`, { method: 'POST', token: seller1 })
  assert.equal(again.status, 409)

  const o = await req(`/orders/${order.id}`, { token: buyer })
  assert.equal(o.json.status, 'processing')

  const view = await req(`/shipments/orders/${order.id}`, { token: buyer })
  assert.equal(view.json.data.id, shipment.id)
  const stranger = await req(`/shipments/orders/${order.id}`, { token: seller2 })
  assert.equal(stranger.status, 403)
})

test('label tra ve HTML co ma van don', async () => {
  const res = await fetch(`${process.env.API_URL || 'http://localhost:3000/api'}/shipments/${shipment.id}/label`, {
    headers: { Authorization: `Bearer ${seller1}` }
  })
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/html/)
  const html = await res.text()
  assert.ok(html.includes(shipment.tracking_code))
  assert.ok(html.includes('VND'))
})

test('webhook tu choi token sai', async () => {
  const res = await req('/shipments/webhook/mock?token=wrong', {
    method: 'POST',
    body: { tracking_code: shipment.tracking_code, status: 'delivered' }
  })
  assert.equal(res.status, 401)
  const none = await req('/shipments/webhook/mock', { method: 'POST', body: {} })
  assert.equal(none.status, 401)
})

test('simulate picked -> delivered cap nhat don va cod_collected_at, idempotent', async () => {
  const sim = (status) => req(`/shipments/${shipment.id}/simulate`, { method: 'POST', token: seller1, body: { status } })

  const picked = await sim('picked')
  assert.equal(picked.status, 200, JSON.stringify(picked.json))
  assert.equal(picked.json.data.status, 'in_transit')
  assert.equal((await req(`/orders/${order.id}`, { token: buyer })).json.status, 'shipped')

  const delivered = await sim('delivered')
  assert.equal(delivered.json.data.status, 'delivered')
  assert.ok(delivered.json.data.cod_collected_at)
  assert.equal((await req(`/orders/${order.id}`, { token: buyer })).json.status, 'delivered')

  const dup = await sim('delivered')
  assert.equal(dup.json.changed, false)
  const view = await req(`/shipments/orders/${order.id}`, { token: buyer })
  assert.equal(view.json.data.events.filter(e => e.status === 'delivered').length, 1)

  const cancel = await req(`/shipments/${shipment.id}`, { method: 'DELETE', token: seller1 })
  assert.equal(cancel.status, 409, 'khong huy duoc van don da giao')
})

test('admin doi soat COD tinh chenh lech', async () => {
  const pending = await req('/shipments/cod/pending?carrier=mock', { token: admin })
  assert.equal(pending.status, 200)
  const mine = pending.json.data.shipments.find(s => s.id === shipment.id)
  assert.ok(mine, 'van don da thu COD phai nam trong danh sach cho doi soat')

  const denied = await req('/shipments/cod/pending', { token: seller1 })
  assert.equal(denied.status, 403)

  const wrongCarrier = await req('/shipments/cod/settlements', {
    method: 'POST',
    token: admin,
    body: { carrier: 'ghn', shipment_ids: [shipment.id], received_amount_vnd: 0 }
  })
  assert.equal(wrongCarrier.status, 400)

  const res = await req('/shipments/cod/settlements', {
    method: 'POST',
    token: admin,
    body: { carrier: 'mock', shipment_ids: [shipment.id], received_amount_vnd: shipment.cod_amount_vnd - 1000, reference: 'TEST-19' }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json))
  assert.equal(res.json.data.expected_amount_vnd, shipment.cod_amount_vnd)
  assert.equal(res.json.data.difference_vnd, -1000)

  const again = await req('/shipments/cod/settlements', {
    method: 'POST',
    token: admin,
    body: { carrier: 'mock', shipment_ids: [shipment.id], received_amount_vnd: shipment.cod_amount_vnd }
  })
  assert.equal(again.status, 409)

  const list = await req('/shipments/cod/settlements', { token: admin })
  assert.ok(list.json.data.some(s => s.reference === 'TEST-19'))
})
