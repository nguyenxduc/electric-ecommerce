import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const buyer = await login(ACCOUNTS.buyer2)
const product = await firstProductOf('tech-world')
const color = product.available_colors?.[0] || null

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
  const item = items.find(i => i.product_id === product.id)
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
  assert.ok([200, 201].includes(res.status), `status=${res.status}`)
  const cart = (await req('/cart', { token: buyer })).json?.cart
  const item = cart?.items?.find(i => i.product_id === product.id)
  assert.equal(item?.quantity, 2)
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
  const removed = await req(`/cart/remove_item/${product.id}`, {
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

test('cart requires authentication', async () => {
  const res = await req('/cart')
  assert.equal(res.status, 401)
})
