// San pham seller an (is_active = false) phai bien mat khoi MOI duong mua hang,
// khong chi danh sach: them vao gio, dat hang, tim kiem, goi y trang chu.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'

const seller2 = await login(ACCOUNTS.seller2) // Gadget Hub
const buyer = await login(ACCOUNTS.buyer2)
const p = await firstProductOf('gadget-hub')
const color = p.available_colors?.[0] || null

const setVisible = is_active =>
  req(`/products/${p.id}/visibility`, { method: 'PATCH', token: seller2, body: { is_active } })

after(async () => {
  await setVisible(true)
  await prisma.$disconnect()
})

test('a hidden product cannot be bought or found', async () => {
  // Dua vao gio truoc khi an: dong cu phai thanh "unavailable", khong tinh tien
  const added = await req(`/cart/add_item/${p.id}`, { method: 'POST', token: buyer, body: { quantity: 1, color } })
  assert.ok(added.status === 200 || added.status === 201, JSON.stringify(added.json).slice(0, 150))

  assert.equal((await setVisible(false)).status, 200)

  const again = await req(`/cart/add_item/${p.id}`, { method: 'POST', token: buyer, body: { quantity: 1, color } })
  assert.equal(again.status, 404)

  const cart = (await req('/cart', { token: buyer })).json.cart
  const line = cart.items.find(i => i.product_id === Number(p.id))
  assert.ok(line?.unavailable, 'existing cart line is marked unavailable')

  const order = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [{ product_id: p.id, quantity: 1, color }],
      shipping_address: { name: 'John', phone: '0912345678', address: 'Demo St' },
      payment_method: 'cod'
    }
  })
  assert.equal(order.status, 400)

  const search = await req(`/products?search=${encodeURIComponent(p.name)}&limit=50`)
  assert.ok(!(search.json.products || []).some(x => x.id === p.id), 'not in search')

  const reco = await req('/recommendations/home?limit=50', { token: buyer })
  const recoIds = (reco.json?.data?.products || []).map(x => x.id)
  assert.ok(!recoIds.includes(p.id), 'not in home recommendations')

  // Don dong gio de khong anh huong test sau
  await req(`/cart/remove_item/${p.id}`, { method: 'DELETE', token: buyer, body: { cart_item_id: line.id } })
})
