// Hoa don + khau tru thue: giao hang -> hoa don, ho kinh doanh bi khau tru,
// doanh nghiep thi khong; tra hang -> huy hoa don, dao khau tru.
// Tests share state and run in declaration order.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, round2, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'
import { onOrderDelivered } from '../services/invoice.service.js'

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1) // Tech World -> company
const seller2 = await login(ACCOUNTS.seller2) // Gadget Hub -> household
const buyer = await login(ACCOUNTS.buyer)

const twP = await firstProductOf('tech-world', 'price-asc')
const ghP = await firstProductOf('gadget-hub', 'price-asc')

const shops = {
  tw: await prisma.shop.findUnique({ where: { slug: 'tech-world' } }),
  gh: await prisma.shop.findUnique({ where: { slug: 'gadget-hub' } })
}
const original = Object.fromEntries(
  Object.entries(shops).map(([k, s]) => [
    k,
    { tax_code: s.tax_code, tax_entity_type: s.tax_entity_type }
  ])
)
await prisma.shop.update({
  where: { id: shops.gh.id },
  data: { tax_code: '=EVIL,"Co"', tax_entity_type: 'household' }
})
await prisma.shop.update({
  where: { id: shops.tw.id },
  data: { tax_code: '0312345678', tax_entity_type: 'company' }
})

let twOrder, ghOrder, ghInvoice

const period = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit'
})
  .format(new Date())
  .slice(0, 7)

after(async () => {
  for (const [k, s] of Object.entries(shops)) {
    await prisma.shop.update({ where: { id: s.id }, data: original[k] })
  }
  await prisma.$disconnect()
})

test('checkout then seller delivers both orders', async () => {
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [
        { product_id: twP.id, quantity: 1, color: twP.available_colors?.[0] || null },
        { product_id: ghP.id, quantity: 1, color: ghP.available_colors?.[0] || null }
      ],
      shipping_address: { name: '<b>Jane</b>', phone: '099', address: 'Demo St' },
      payment_method: 'cod',
      invoice_request: {
        company_name: 'ACME <script>alert(1)</script>',
        tax_code: '0101234567',
        address: '1 Road',
        email: 'acct@acme.vn'
      }
    }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json).slice(0, 200))
  twOrder = res.json.orders.find(o => o.shop?.slug === 'tech-world')
  ghOrder = res.json.orders.find(o => o.shop?.slug === 'gadget-hub')
  for (const [o, tok] of [[twOrder, seller1], [ghOrder, seller2]]) {
    for (const status of ['processing', 'delivered']) {
      const r = await req(`/orders/${o.id}/update_status`, {
        method: 'PATCH',
        token: tok,
        body: { status }
      })
      assert.equal(r.status, 200, `${o.id} -> ${status}: ${JSON.stringify(r.json)}`)
    }
  }
})

test('invoice has exact VAT split, number format and snapshots', async () => {
  const res = await req(`/invoices/orders/${ghOrder.id}`, { token: buyer })
  assert.equal(res.status, 200)
  ghInvoice = res.json.data
  assert.match(ghInvoice.invoice_number, /^C\d{2}TNG-\d{8}$|^.+-\d{8}$/)
  assert.equal(ghInvoice.status, 'issued')
  assert.equal(
    round2(Number(ghInvoice.subtotal) + Number(ghInvoice.vat_amount)),
    round2(Number(ghInvoice.total))
  )
  assert.equal(Number(ghInvoice.total), Number(ghOrder.total_amount))
  assert.equal(ghInvoice.buyer.company_name, 'ACME <script>alert(1)</script>')
  assert.equal(ghInvoice.seller.name, shops.gh.name)
  const itemSum = ghInvoice.items.reduce((s, i) => s + i.total, 0)
  assert.equal(round2(itemSum), round2(Number(ghInvoice.total)), 'items incl. shipping == total')
})

test('invoice access: buyer/seller/admin yes, other seller no', async () => {
  assert.equal((await req(`/invoices/orders/${ghOrder.id}`, { token: seller2 })).status, 200)
  assert.equal((await req(`/invoices/orders/${ghOrder.id}`, { token: admin })).status, 200)
  assert.equal((await req(`/invoices/orders/${ghOrder.id}`, { token: seller1 })).status, 404)
  assert.equal((await req(`/invoices/orders/${ghOrder.id}`)).status, 401)
})

test('printable html escapes user strings and has Vietnamese labels', async () => {
  const res = await fetch(`${process.env.API_URL || 'http://localhost:3000/api'}/invoices/${ghInvoice.id}/html`, {
    headers: { Authorization: `Bearer ${buyer}` }
  })
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(html.includes('HOA DON GIA TRI GIA TANG'))
  assert.ok(html.includes('Tong thanh toan'))
  assert.ok(!html.includes('<script>alert(1)'), 'raw script tag must not appear')
  assert.ok(html.includes('ACME &lt;script&gt;'))
})

test('household shop is withheld, company shop is not', async () => {
  const gh = await prisma.taxWithholding.findUnique({ where: { order_id: BigInt(ghOrder.id) } })
  const base = round2(Number(ghOrder.total_amount) - Number(ghOrder.shipping_fee))
  assert.ok(gh)
  assert.equal(Number(gh.base_amount), base)
  assert.equal(Number(gh.vat_amount), round2(base * 0.01))
  assert.equal(Number(gh.pit_amount), round2(base * 0.005))
  assert.equal(gh.period, period)
  assert.equal(await prisma.taxWithholding.findUnique({ where: { order_id: BigInt(twOrder.id) } }), null)
  assert.ok(await prisma.invoice.findUnique({ where: { order_id: BigInt(twOrder.id) } }), 'company still gets invoice')
})

test('onOrderDelivered is idempotent', async () => {
  const before = await prisma.invoice.count({ where: { order_id: BigInt(ghOrder.id) } })
  await prisma.$transaction(tx => onOrderDelivered(tx, { id: BigInt(ghOrder.id) }))
  assert.equal(before, 1)
  assert.equal(await prisma.invoice.count({ where: { order_id: BigInt(ghOrder.id) } }), 1)
  assert.equal(await prisma.taxWithholding.count({ where: { order_id: BigInt(ghOrder.id) } }), 1)
})

test('seller summary, seller list, admin list', async () => {
  const sum = await req(`/tax/shop/mine/summary?year=${period.slice(0, 4)}`, { token: seller2 })
  assert.equal(sum.status, 200)
  const m = sum.json.data.months.find(x => x.period === period)
  assert.ok(m && m.orders >= 1 && m.base > 0)
  assert.equal(round2(m.vat + m.pit), m.total_withheld)

  const mine = await req('/invoices/shop/mine', { token: seller2 })
  assert.ok(mine.json.data.invoices.some(i => i.id === ghInvoice.id))
  assert.equal((await req('/invoices/shop/mine', { token: buyer })).status, 403)

  const all = await req(`/invoices?shop_id=${shops.gh.id}&status=issued`, { token: admin })
  assert.equal(all.status, 200)
  assert.ok(all.json.data.invoices.every(i => i.status === 'issued'))
  assert.equal((await req('/invoices', { token: seller2 })).status, 403)
})

test('admin tax report + csv (with injection guard)', async () => {
  const rep = await req(`/tax/report?period=${period}`, { token: admin })
  assert.equal(rep.status, 200)
  const row = rep.json.data.rows.find(r => String(r.shop_id) === String(shops.gh.id))
  assert.ok(row && row.orders >= 1)
  // Shop company khong bi khau tru. Kiem tren chinh don cua test, khong tren ca
  // bao cao: test khac trong cung luot chay co the da giao don cua shop nay khi
  // no con la household.
  assert.equal(
    await prisma.taxWithholding.count({ where: { order_id: BigInt(twOrder.id) } }),
    0,
    'company order has no withholding'
  )
  assert.equal((await req('/tax/report?period=bad', { token: admin })).status, 400)
  assert.equal((await req(`/tax/report?period=${period}`, { token: seller2 })).status, 403)

  const res = await fetch(`${process.env.API_URL || 'http://localhost:3000/api'}/tax/report.csv?period=${period}`, {
    headers: { Authorization: `Bearer ${admin}` }
  })
  assert.equal(res.status, 200)
  const csv = await res.text()
  assert.ok(csv.startsWith('shop_name,tax_code'))
  assert.ok(csv.includes(`"'=EVIL,""Co"""`), csv)
})

test('approved return cancels invoice and reverses withholding', async () => {
  const r = await req('/returns', {
    method: 'POST',
    token: buyer,
    body: { order_id: ghOrder.id, reason: 'invoice test return' }
  })
  assert.equal(r.status, 201)
  const list = (await req('/returns/shop/mine', { token: seller2 })).json?.data?.requests
  const rid = list.find(x => x.order.id === Number(ghOrder.id))?.id
  const res = await req(`/returns/${rid}/resolve`, {
    method: 'PATCH',
    token: seller2,
    body: { action: 'approve' }
  })
  assert.equal(res.status, 200)

  const inv = (await req(`/invoices/orders/${ghOrder.id}`, { token: buyer })).json.data
  assert.equal(inv.status, 'cancelled')
  assert.ok(inv.cancelled_at)
  const w = await prisma.taxWithholding.findUnique({ where: { order_id: BigInt(ghOrder.id) } })
  assert.ok(w.reversed_at, 'row kept, marked reversed')
  const counted = await prisma.taxWithholding.count({
    where: { shop_id: shops.gh.id, period, reversed_at: null, order_id: BigInt(ghOrder.id) }
  })
  assert.equal(counted, 0, 'reversed row excluded from reports')
})
