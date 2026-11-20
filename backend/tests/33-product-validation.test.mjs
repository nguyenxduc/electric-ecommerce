// Tao san pham thieu truong bat buoc phai tra 400 co thong bao (truoc day 500),
// va co an/hien (is_active) phai loai san pham khoi cac truy van cua nguoi mua.
import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'

const seller = await login(ACCOUNTS.seller1)
const seller2 = await login(ACCOUNTS.seller2)

test('create product with empty body returns 400 naming missing fields', async () => {
  const res = await req('/products', { method: 'POST', token: seller, body: {} })
  assert.equal(res.status, 400)
  assert.match(res.json.message, /name/)
  assert.match(res.json.message, /price/)
  assert.match(res.json.message, /category_id/)
})

test('create product with unknown category returns 400', async () => {
  const res = await req('/products', {
    method: 'POST',
    token: seller,
    body: { name: 'X', price: 10, category_id: 999999999 }
  })
  assert.equal(res.status, 400)
  assert.match(res.json.message, /Category/)
})

test('hidden product disappears from buyer queries and comes back when re-enabled', async () => {
  const mine = await req('/products/shop/mine?limit=1', { token: seller })
  const p = mine.json.products[0]
  const shopId = p.shop_id ?? p.shop?.id
  const listed = async () => {
    const r = await req(`/products?shop_id=${shopId}&limit=100`)
    return r.json.products.some(x => String(x.id) === String(p.id))
  }
  assert.equal(await listed(), true)

  // Chi chu shop moi doi duoc
  const other = await req(`/products/${p.id}/visibility`, {
    method: 'PATCH',
    token: seller2,
    body: { is_active: false }
  })
  assert.equal(other.status, 403)

  const bad = await req(`/products/${p.id}/visibility`, {
    method: 'PATCH',
    token: seller,
    body: { is_active: 'no' }
  })
  assert.equal(bad.status, 400)

  try {
    const hide = await req(`/products/${p.id}/visibility`, {
      method: 'PATCH',
      token: seller,
      body: { is_active: false }
    })
    assert.equal(hide.status, 200)
    assert.equal(await listed(), false)
    assert.equal((await req(`/products/${p.id}`)).status, 404)
    // Chu shop van xem duoc va loc duoc theo tab Hidden
    assert.equal((await req(`/products/${p.id}`, { token: seller })).status, 200)
    const hidden = await req('/products/shop/mine?status=hidden&limit=100', { token: seller })
    assert.ok(hidden.json.products.some(x => String(x.id) === String(p.id)))
  } finally {
    await req(`/products/${p.id}/visibility`, {
      method: 'PATCH',
      token: seller,
      body: { is_active: true }
    })
  }
  assert.equal(await listed(), true)
  assert.equal((await req(`/products/${p.id}`)).status, 200)
})
