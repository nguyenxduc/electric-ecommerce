import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, round2 } from './helpers.mjs'

// Flash sale: seller dat giam gia theo khung gio; trong khung do gia hien thi,
// gio hang va gia chot tren don deu la gia flash, ngoai khung tro ve discount.

const seller = await login(ACCOUNTS.seller1)
const seller2 = await login(ACCOUNTS.seller2)
const buyer = await login(ACCOUNTS.buyer2)

const HOUR = 3600 * 1000
const iso = ms => new Date(Date.now() + ms).toISOString()

const list = await req('/shops/tech-world/products?limit=20')
const p = (list.json?.products ?? [])
  // bo qua san pham seed da co flash sale: test can trang thai "chua co flash" ban dau
  .filter(x => !(x.variants?.length) && (x.quantity ?? 0) > 0 && x.flash_discount == null)
  .sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0))[0]
assert.ok(p, 'tech-world khong co san pham dat duoc')
const pid = p.id
const price = Number(p.price)
const flash = round2(price / 2)
const patch = (body, token = seller) =>
  req(`/products/${pid}`, { method: 'PATCH', token, body })
const detail = async () => (await req(`/products/${pid}`)).json

const original = await prisma.product.findUnique({
  where: { id: BigInt(pid) },
  select: { flash_discount: true, flash_starts_at: true, flash_ends_at: true }
})
let cartItemId = null
let orderId = null

after(async () => {
  if (orderId) await req(`/orders/${orderId}/cancel`, { method: 'PATCH', token: buyer })
  if (cartItemId) {
    await req(`/cart/remove_item/${pid}?cart_item_id=${cartItemId}`, { method: 'DELETE', token: buyer })
  }
  await prisma.product.update({ where: { id: BigInt(pid) }, data: original })
  await prisma.$disconnect()
})

test('validate: thieu gio, end <= start, qua 7 ngay, gia >= price, <= 0 deu 400', async () => {
  const bad = [
    { flash_discount: flash },
    { flash_discount: flash, flash_starts_at: iso(-HOUR), flash_ends_at: iso(-2 * HOUR) },
    { flash_discount: flash, flash_starts_at: iso(-HOUR), flash_ends_at: iso(8 * 24 * HOUR) },
    { flash_discount: price, flash_starts_at: iso(-HOUR), flash_ends_at: iso(HOUR) },
    { flash_discount: 0, flash_starts_at: iso(-HOUR), flash_ends_at: iso(HOUR) },
    // cua so da ket thuc
    { flash_discount: flash, flash_starts_at: iso(-3 * HOUR), flash_ends_at: iso(-HOUR) },
    // flash khong lon hon giam gia thuong thi "sale" lai lam gia cao hon
    { discount: flash, flash_discount: flash, flash_starts_at: iso(-HOUR), flash_ends_at: iso(HOUR) }
  ]
  for (const body of bad) {
    const res = await patch(body)
    assert.equal(res.status, 400, JSON.stringify(body) + ' -> ' + JSON.stringify(res.json))
  }
})

test('seller khac khong duoc dat flash sale', async () => {
  const res = await patch(
    { flash_discount: flash, flash_starts_at: iso(-HOUR), flash_ends_at: iso(HOUR) },
    seller2
  )
  assert.ok([403, 404].includes(res.status), String(res.status))
})

test('flash dang chay: gia hien thi, danh sach flash-sale, gio hang, don hang', async () => {
  const set = await patch({
    flash_discount: flash,
    flash_starts_at: iso(-HOUR),
    flash_ends_at: iso(2 * HOUR)
  })
  assert.equal(set.status, 200, JSON.stringify(set.json))

  const d = await detail()
  assert.equal(d.flash_sale.active, true)
  assert.equal(round2(d.final_price), round2(price - flash))
  assert.equal(round2(d.discount), flash)

  const fs = await req('/products/flash-sale?limit=50')
  assert.equal(fs.status, 200)
  assert.ok(fs.json.products.some(x => String(x.id) === String(pid)))

  const add = await req(`/cart/add_item/${pid}`, {
    method: 'POST',
    token: buyer,
    body: {
      quantity: 1,
      ...((d.available_colors ?? []).find(c => c.quantity > 0) && {
        color: (({ name, code }) => ({ name, code }))(d.available_colors.find(c => c.quantity > 0))
      })
    }
  })
  assert.equal(add.status, 201, JSON.stringify(add.json))
  const cart = (await req('/cart', { token: buyer })).json.cart
  const line = cart.items.find(i => String(i.product_id) === String(pid))
  assert.ok(line)
  cartItemId = line.id
  assert.equal(round2(line.final_price), round2(price - flash))

  const order = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [
        {
          product_id: pid,
          quantity: 1,
          ...((d.available_colors ?? []).find(c => c.quantity > 0) && {
            color: (({ name, code }) => ({ name, code }))(d.available_colors.find(c => c.quantity > 0))
          })
        }
      ],
      shipping_address: { name: 'Flash Test', phone: '0900000046', address: 'HN' },
      payment_method: 'cod'
    }
  })
  assert.equal(order.status, 201, JSON.stringify(order.json))
  orderId = order.json.orders[0].id
  const item = await prisma.orderItem.findFirst({ where: { order_id: BigInt(orderId) } })
  assert.equal(round2(item.unit_price), round2(price - flash))
})

test('flash chua toi gio: khong active, gia tro ve discount thuong', async () => {
  const res = await patch({
    flash_discount: flash,
    flash_starts_at: iso(HOUR),
    flash_ends_at: iso(2 * HOUR)
  })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const d = await detail()
  assert.equal(d.flash_sale.active, false)
  assert.equal(round2(d.final_price), round2(price - Number(d.flash_sale.original_discount)))
  const fs = await req('/products/flash-sale?limit=50')
  assert.ok(!fs.json.products.some(x => String(x.id) === String(pid)))
})

test('flash het han (sua thang DB): gia tro ve discount thuong', async () => {
  await prisma.product.update({
    where: { id: BigInt(pid) },
    data: { flash_starts_at: new Date(Date.now() - 2 * HOUR), flash_ends_at: new Date(Date.now() - HOUR) }
  })
  const d = await detail()
  assert.equal(d.flash_sale.active, false)
  assert.equal(round2(d.final_price), round2(price - Number(d.flash_sale.original_discount)))
})

test('form gui lai khung flash da het han: van luu duoc, flash bi xoa', async () => {
  const row = await prisma.product.findUnique({ where: { id: BigInt(pid) } })
  assert.ok(row.flash_ends_at < new Date(), 'test truoc phai de flash het han')
  const res = await patch({
    name: row.name,
    flash_discount: Number(row.flash_discount),
    flash_starts_at: row.flash_starts_at.toISOString(),
    flash_ends_at: row.flash_ends_at.toISOString()
  })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const after = await prisma.product.findUnique({ where: { id: BigInt(pid) } })
  assert.equal(after.flash_discount, null)
})

test('xoa flash sale bang flash_discount rong', async () => {
  const res = await patch({ flash_discount: '' })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const row = await prisma.product.findUnique({ where: { id: BigInt(pid) } })
  assert.equal(row.flash_discount, null)
  assert.equal(row.flash_ends_at, null)
})
