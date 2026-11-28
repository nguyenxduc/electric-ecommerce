import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const buyer = await login(ACCOUNTS.buyer2)
const product = await firstProductOf('tech-world')
const color = product.available_colors?.[0] || null

// Seed tao san mot dong gio ngau nhien (co the cung san pham, khac mau): luon so ca mau
const isLine = i => i.product_id === product.id && (!color || i.color?.code === color.code)

test('add to cart', async () => {
  const res = await req(`/cart/add_item/${product.id}`, {
    method: 'POST',
    token: buyer,
    body: { quantity: 1, color }
  })
  assert.ok([200, 201].includes(res.status), `status=${res.status}`)
})

test('cart read groups items with their shop info', async () => {
  const res = await req('/cart', { token: buyer })
  assert.equal(res.status, 200)
  const items = res.json?.cart?.items || []
  const item = items.find(isLine)
  assert.ok(item, 'added item present')
  assert.equal(item.shop?.slug, 'tech-world', 'item carries shop info')
  assert.ok(item.shop?.status === 'active')
})

test('update quantity', async () => {
  const res = await req(`/cart/update_item/${product.id}`, {
    method: 'PUT',
    token: buyer,
    body: { quantity: 2, color }
  })
  // Flaky 1 lan, chua tai hien: in du body + cac dong cua san pham de lan sau tim ra nguyen nhan
  const lines = async () => JSON.stringify((await req('/cart', { token: buyer })).json?.cart?.items
    ?.filter(i => i.product_id === product.id).map(i => ({ color: i.color, quantity: i.quantity })))
  assert.ok([200, 201].includes(res.status), `status=${res.status} ${JSON.stringify(res.json)} lines=${await lines()}`)
  const cart = (await req('/cart', { token: buyer })).json?.cart
  const item = cart?.items?.find(isLine)
  assert.equal(item?.quantity, 2, `lines=${await lines()}`)
})

test('cart totals are consistent with items', async () => {
  const cart = (await req('/cart', { token: buyer })).json?.cart
  const sum = (cart?.items || []).reduce(
    (s, i) => s + i.final_price * i.quantity,
    0
  )
  assert.ok(Math.abs(sum - cart.total_price) < 0.01, `${sum} vs ${cart.total_price}`)
})

test('remove item and clear cart', async () => {
  const removed = await req(`/cart/remove_item/${product.id}${color ? `?color_code=${encodeURIComponent(color.code)}` : ''}`, {
    method: 'DELETE',
    token: buyer
  })
  assert.ok([200, 204].includes(removed.status), `status=${removed.status}`)

  // add again then clear
  await req(`/cart/add_item/${product.id}`, {
    method: 'POST',
    token: buyer,
    body: { quantity: 1, color }
  })
  const cleared = await req('/cart/clear', { method: 'DELETE', token: buyer })
  assert.ok([200, 204].includes(cleared.status), `status=${cleared.status}`)
  const cart = (await req('/cart', { token: buyer })).json?.cart
  assert.equal((cart?.items || []).length, 0)
})

test('hai dong cung san pham khac mau: sua dung dong theo mau, thieu mau thi 400', async () => {
  const colors = product.available_colors ?? []
  if (colors.length < 2) return
  const [a, b] = colors
  for (const c of [a, b]) {
    await req(`/cart/add_item/${product.id}`, { method: 'POST', token: buyer, body: { quantity: 1, color: c } })
  }
  const ambiguous = await req(`/cart/update_item/${product.id}`, { method: 'PUT', token: buyer, body: { quantity: 2 } })
  assert.equal(ambiguous.status, 400)
  const ok = await req(`/cart/update_item/${product.id}`, { method: 'PUT', token: buyer, body: { quantity: 2, color: b } })
  assert.equal(ok.status, 200, JSON.stringify(ok.json))
  const items = (await req('/cart', { token: buyer })).json.cart.items.filter(i => i.product_id === product.id)
  assert.equal(items.find(i => i.color?.code === b.code).quantity, 2)
  assert.equal(items.find(i => i.color?.code === a.code).quantity, 1)
  await req('/cart/clear', { method: 'DELETE', token: buyer })
})

test('cart requires authentication', async () => {
  const res = await req('/cart')
  assert.equal(res.status, 401)
})
