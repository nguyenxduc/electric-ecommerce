// Hoi quy vong review 2: gio hang, thue dao khac ky, loc ngay hoa don VN,
// tong COD, bao phi GHN/GHTK, job sync van don. Moi test tra lai DB (after).
import 'dotenv/config'
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/db.js'
import { req, login, API, ACCOUNTS } from './helpers.mjs'
import { periodReport, shopYearSummary } from '../services/tax.service.js'

const run = promisify(execFile)
const BACKEND_DIR = fileURLToPath(new URL('..', import.meta.url))
const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const buyer2 = await login(ACCOUNTS.applicant) // user rieng: gio hang cua jane/john bi file khac xoa song song
const tag = Date.now().toString(36)
const adminFetch = path => fetch(API + path, { headers: { Authorization: `Bearer ${admin}` } })

const cleanup = []
after(async () => {
  for (const fn of cleanup.reverse()) await fn().catch(() => {})
  await prisma.$disconnect()
})

// --- Cart ---------------------------------------------------------------------
const category = await prisma.category.findFirst({ where: { deleted_at: null } })
const created = await req('/products', {
  method: 'POST',
  token: seller1,
  body: {
    name: `R2 Cart ${tag}`,
    price: 100,
    description: 'r2',
    category_id: category.id.toString(),
    variants: [
      { sku: `R2-A-${tag}`, name: 'A', quantity: 4 },
      { sku: `R2-B-${tag}`, name: 'B', quantity: 3 }
    ]
  }
})
assert.ok([200, 201].includes(created.status), JSON.stringify(created.json))
const pid = BigInt(created.json.product.id)
cleanup.push(async () => {
  await prisma.cartItem.deleteMany({ where: { product_id: pid } })
  await prisma.product.update({ where: { id: pid }, data: { deleted_at: new Date() } })
})
const [vA, vB] = await prisma.productVariant.findMany({ where: { product_id: pid }, orderBy: { id: 'asc' } })
const add = (quantity, v = vA) =>
  req(`/cart/add_item/${pid}`, { method: 'POST', token: buyer2, body: { quantity, variant_id: v.id.toString() } })

test('cart: quantity khong phai so nguyen >= 1 tra 400 (add va update)', async () => {
  for (const q of ['abc', 1.5, 0, -1, null]) {
    assert.equal((await add(q)).status, 400, `add ${q}`)
  }
  assert.equal((await add(1)).status, 201)
  const line = await prisma.cartItem.findFirst({ where: { product_id: pid, variant_id: vA.id, deleted_at: null } })
  for (const q of ['abc', 1.5, 0]) {
    const r = await req(`/cart/update_item/${pid}`, {
      method: 'PUT',
      token: buyer2,
      body: { quantity: q, cart_item_id: line.id.toString() }
    })
    assert.equal(r.status, 400, `update ${q}`)
  }
})

test('cart: them tiep vuot ton kho sau khi gop bi 400', async () => {
  assert.equal((await add(3)).status, 201) // 1 + 3 = 4 = ton kho
  assert.equal((await add(1)).status, 400) // 5 > 4
  const line = await prisma.cartItem.findFirst({ where: { product_id: pid, variant_id: vA.id, deleted_at: null } })
  assert.equal(line.quantity, 4)
})

test('cart: bien the xoa mem bi danh dau unavailable va khong tinh vao tong', async () => {
  assert.equal((await add(2, vB)).status, 201)
  await prisma.productVariant.update({ where: { id: vB.id }, data: { deleted_at: new Date() } })
  const cart = (await req('/cart', { token: buyer2 })).json.cart
  const lines = cart.items.filter(i => String(i.product_id) === String(pid))
  const b = lines.find(i => i.variant?.id === Number(vB.id))
  const a = lines.find(i => i.variant?.id === Number(vA.id))
  assert.equal(b.unavailable, true, 'dong van con de go bo')
  assert.equal(a.unavailable, false)
  const upd = await req(`/cart/update_item/${pid}`, {
    method: 'PUT',
    token: buyer2,
    body: { quantity: 1, cart_item_id: String(b.id) }
  })
  assert.equal(upd.status, 400)
  const expected = cart.items.filter(i => !i.unavailable).reduce((s, i) => s + i.subtotal, 0)
  assert.equal(cart.total_price, expected)
  const rm = await req(`/cart/remove_item/${pid}?cart_item_id=${b.id}`, { method: 'DELETE', token: buyer2 })
  assert.equal(rm.status, 200)
})

// --- Thue: dao khac ky --------------------------------------------------------
test('thue: dong dao tinh am o ky reversed_at (gio VN), ky goc khong bi viet lai', async () => {
  const shop = await prisma.shop.findUnique({ where: { slug: 'gadget-hub' } })
  const orders = await prisma.order.findMany({ where: { tax_withholding: null }, take: 2, select: { id: true } })
  assert.equal(orders.length, 2, 'can 2 don chua co dong khau tru')
  const base = { shop_id: shop.id, base_amount: 1000, vat_rate: 0.01, vat_amount: 10, pit_rate: 0.005, pit_amount: 5 }
  await prisma.taxWithholding.createMany({
    data: [
      // 17:30Z cuoi thang 3 = 00:30 ngay 01/04 gio VN -> ky dao 2031-04
      { ...base, order_id: orders[0].id, period: '2031-03', reversed_at: new Date('2031-03-31T17:30:00Z') },
      { ...base, order_id: orders[1].id, period: '2031-03', reversed_at: null }
    ]
  })
  cleanup.push(() => prisma.taxWithholding.deleteMany({ where: { order_id: { in: orders.map(o => o.id) } } }))

  const mine = rep => rep.find(r => r.shop_id === shop.id)
  const mar = mine(await periodReport('2031-03'))
  assert.deepEqual([mar.orders, mar.base, mar.vat, mar.pit], [2, 2000, 20, 10], 'ky goc giu ca dong da dao')
  const apr = mine(await periodReport('2031-04'))
  assert.deepEqual([apr.orders, apr.base, apr.vat, apr.pit], [-1, -1000, -10, -5], 'dao la so am o ky dao')
  assert.equal(mine(await periodReport('2031-05')), undefined)

  const months = await shopYearSummary(shop.id, 2031)
  assert.deepEqual(months.map(m => [m.period, m.total_withheld]), [['2031-03', 30], ['2031-04', -15]])

  const csv = await adminFetch('/tax/report.csv?period=2031-04')
  assert.equal(csv.status, 200)
  assert.match(await csv.text(), /,-1,-1000,-10,-5/)
})

// --- Hoa don: loc ngay VN -------------------------------------------------------
test('hoa don: from/to theo gio VN, to bao gom ca ngay, ngay in theo VN', async () => {
  const inv = await prisma.invoice.findFirst()
  assert.ok(inv, 'can it nhat 1 hoa don (file 22 tao)')
  const old = inv.issued_at
  cleanup.push(() => prisma.invoice.update({ where: { id: inv.id }, data: { issued_at: old } }))
  // 18:00Z ngay 10/06 = 01:00 ngay 11/06 gio VN
  await prisma.invoice.update({ where: { id: inv.id }, data: { issued_at: new Date('2031-06-10T18:00:00Z') } })
  const has = async q => {
    const r = await req(`/invoices?shop_id=${inv.shop_id}&${q}&limit=100`, { token: admin })
    return r.json.data.invoices.some(i => String(i.id) === inv.id.toString())
  }
  assert.equal(await has('from=2031-06-11&to=2031-06-11'), true)
  assert.equal(await has('from=2031-06-10&to=2031-06-10'), false)
  const html = await (await adminFetch(`/invoices/${inv.id}/html`)).text()
  assert.match(html, /Ngay: 2031-06-11/)
})

// --- COD pending ------------------------------------------------------------------
test('cod pending: count/total tinh bang aggregate tren cung dieu kien', async () => {
  // Carrier rieng de khong dung do file 19 chay song song
  const carrier = `r2-${tag}`
  const orders = await prisma.order.findMany({ where: { shipment: null }, take: 2, select: { id: true } })
  assert.equal(orders.length, 2)
  const when = new Date()
  const ids = []
  for (const [k, o] of orders.entries()) {
    const sh = await prisma.shipment.create({
      data: { order_id: o.id, carrier, status: 'delivered', cod_amount_vnd: 1000 * (k + 1), cod_collected_at: when }
    })
    ids.push(sh.id)
  }
  cleanup.push(() => prisma.shipment.deleteMany({ where: { id: { in: ids } } }))
  const r = await req(`/shipments/cod/pending?carrier=${carrier}`, { token: admin })
  assert.equal(r.status, 200)
  assert.equal(r.json.data.count, 2)
  assert.equal(r.json.data.total_cod_vnd, 3000)
})

// --- Bao phi nha van chuyen --------------------------------------------------------
test('ghtk/ghn quote: thieu hoac <= 0 phi thi nem loi (khong thanh free ship)', async () => {
  const realFetch = globalThis.fetch
  const keys = ['GHTK_TOKEN', 'GHN_TOKEN', 'GHN_SHOP_ID']
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]))
  for (const k of keys) process.env[k] = '1'
  let ghtkFee
  let ghnFee
  globalThis.fetch = async url => {
    const u = String(url)
    let body = { success: true, fee: ghtkFee }
    if (u.includes('master-data/province')) body = { data: [{ ProvinceID: 1, ProvinceName: 'Ha Noi' }] }
    else if (u.includes('master-data/district')) body = { data: [{ DistrictID: 1, DistrictName: 'Ba Dinh' }] }
    else if (u.includes('master-data/ward')) body = { data: [{ WardCode: 'w', WardName: 'Phuc Xa' }] }
    else if (u.includes('shipping-order/fee')) body = { data: ghnFee }
    return new Response(JSON.stringify(body), { status: 200 })
  }
  try {
    const { default: ghtk } = await import('../services/shipping/providers/ghtk.js')
    const { default: ghn } = await import('../services/shipping/providers/ghn.js')
    const args = {
      from: { province: 'Ha Noi', district: 'Ba Dinh' },
      to: { province: 'Ha Noi', district: 'Ba Dinh', ward: 'Phuc Xa' },
      weightGrams: 500
    }
    for (const bad of [undefined, { fee: 0 }, { fee: -1 }, { fee: 'abc' }]) {
      ghtkFee = bad
      await assert.rejects(() => ghtk.quote(args), /GHTK/)
    }
    for (const bad of [undefined, { total: 0 }, { total: -5 }]) {
      ghnFee = bad
      await assert.rejects(() => ghn.quote(args), /GHN/)
    }
    ghtkFee = { fee: 22000 }
    assert.equal((await ghtk.quote(args)).feeVnd, 22000)
    ghnFee = { total: 31000 }
    assert.equal((await ghn.quote(args)).feeVnd, 31000)
  } finally {
    globalThis.fetch = realFetch
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  }
})

// --- Job sync van don ---------------------------------------------------------------
test('syncShipments: van don loi duoc bump updated_at de khong chan hang doi', async () => {
  const order = await prisma.order.findFirst({ where: { shipment: null }, select: { id: true } })
  assert.ok(order, 'can 1 don chua co van don')
  const s = await prisma.shipment.create({
    data: {
      order_id: order.id,
      carrier: 'ghn',
      tracking_code: `R2-${tag}`,
      status: 'in_transit',
      updated_at: new Date(Date.now() - 24 * 3600 * 1000)
    }
  })
  cleanup.push(() => prisma.shipment.deleteMany({ where: { id: s.id } }))
  // Khong co credential GHN -> getStatus nem loi -> phai bump
  await run('node', ['jobs/syncShipments.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, GHN_TOKEN: '', GHN_SHOP_ID: '' }
  })
  const fresh = await prisma.shipment.findUnique({ where: { id: s.id } })
  assert.ok(fresh.updated_at > new Date(Date.now() - 5 * 60 * 1000), 'updated_at da duoc bump')
})
