import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, round2 } from './helpers.mjs'

// Dong gio hang co bien the: price (gia goc, dung de gach ngang) phai gom
// price_delta, khop voi final_price va tong cua summarizeCart.

const buyer = await login(ACCOUNTS.buyer2)

const variant = await prisma.productVariant.findFirst({
  where: {
    deleted_at: null,
    price_delta: { gt: 0 },
    quantity: { gt: 0 },
    product: { deleted_at: null, shop: { status: 'active', deleted_at: null } }
  },
  include: { product: true }
})

let cartItemId = null

after(async () => {
  if (cartItemId) {
    await req(`/cart/remove_item/${variant.product_id}?cart_item_id=${cartItemId}`, {
      method: 'DELETE',
      token: buyer
    })
  }
  await prisma.$disconnect()
})

test('dong bien the: price = gia goc + delta, price - final_price = discount', async t => {
  if (!variant) return t.skip('seed khong co bien the price_delta > 0')
  const add = await req(`/cart/add_item/${variant.product_id}`, {
    method: 'POST',
    token: buyer,
    body: { quantity: 1, variant_id: variant.id.toString() }
  })
  assert.equal(add.status, 201, JSON.stringify(add.json))

  const cart = (await req('/cart', { token: buyer })).json.cart
  const line = cart.items.find(i => i.variant?.id === Number(variant.id))
  assert.ok(line, 'khong thay dong bien the trong gio')
  cartItemId = line.id

  const base = Number(variant.product.price)
  const delta = Number(variant.price_delta)
  const discount = Number(variant.product.discount || 0)
  assert.equal(round2(line.price), round2(base + delta))
  assert.equal(round2(line.price - line.final_price), round2(discount))

  // Tong goc cua gio = tong price * so luong cac dong con hang
  const original = cart.items
    .filter(i => !i.unavailable)
    .reduce((s, i) => s + i.price * i.quantity, 0)
  assert.equal(round2(original), round2(cart.total_original_price))
})
