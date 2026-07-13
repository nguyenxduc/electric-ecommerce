import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const buyer = await login(ACCOUNTS.buyer)

test('admin-only endpoints reject plain users with 403', async () => {
  const adminOnly = [
    ['/orders/stats', 'GET'],
    ['/orders', 'GET'],
    ['/dashboard/stats', 'GET'],
    ['/customers', 'GET'],
    ['/audit-logs', 'GET'],
    ['/coupons', 'GET'],
    ['/shops/admin/all', 'GET']
  ]
  for (const [path, method] of adminOnly) {
    const res = await req(path, { method, token: buyer })
    assert.equal(res.status, 403, `${method} ${path} as user -> ${res.status}`)
  }
})

test('admin-only endpoints work for the admin', async () => {
  for (const path of ['/orders/stats', '/dashboard/stats', '/shops/admin/all']) {
    const res = await req(path, { token: admin })
    assert.equal(res.status, 200, `${path} as admin -> ${res.status}`)
  }
})

test('unauthenticated writes to platform settings are rejected', async () => {
  const res = await req('/settings', {
    method: 'POST',
    body: { key: 'hack', value: 'x' }
  })
  assert.equal(res.status, 401)
})

test('payment creation requires authentication', async () => {
  const res = await req('/payments/momo', {
    method: 'POST',
    body: { order_group_id: 1 }
  })
  assert.equal(res.status, 401)
})

test('seller endpoints reject plain users with 403', async () => {
  const sellerOnly = [
    '/products/shop/mine',
    '/orders/shop/mine',
    '/dashboard/shop/stats',
    '/coupons/shop/mine/list',
    '/returns/shop/mine',
    '/chat/shop/mine'
  ]
  for (const path of sellerOnly) {
    const res = await req(path, { token: buyer })
    assert.equal(res.status, 403, `${path} as user -> ${res.status}`)
  }
})

test('seller endpoints work for a seller', async () => {
  for (const path of ['/products/shop/mine', '/orders/shop/mine', '/dashboard/shop/stats']) {
    const res = await req(path, { token: seller1 })
    assert.equal(res.status, 200, `${path} as seller -> ${res.status}`)
  }
})

test('a seller cannot edit another shop\'s product (ownership check)', async () => {
  const foreign = await firstProductOf('gadget-hub')
  const res = await req(`/products/${foreign.id}`, {
    method: 'PATCH',
    token: seller1, // Tech World owner attacking a Gadget Hub product
    body: { name: 'hacked' }
  })
  assert.equal(res.status, 403)
})

test('a seller cannot delete another shop\'s product', async () => {
  const foreign = await firstProductOf('gadget-hub')
  const res = await req(`/products/${foreign.id}`, {
    method: 'DELETE',
    token: seller1
  })
  assert.equal(res.status, 403)
})

test('sellers create products only under their own shop (shop_id is ignored)', async () => {
  const ghShopId = (await req('/shops/gadget-hub')).json?.data?.id
  const categoryId = (await firstProductOf('tech-world'))?.category_id
  const created = await req('/products', {
    method: 'POST',
    token: seller1,
    body: {
      name: 'AUTHZ Probe Product',
      price: 10,
      quantity: 1,
      category_id: categoryId,
      shop_id: ghShopId // attempt to plant a product into another shop
    }
  })
  assert.equal(created.status, 201, JSON.stringify(created.json).slice(0, 150))
  const productId = created.json?.product?.id
  const detail = await req(`/products/${productId}`, { token: seller1 })
  assert.equal(detail.json?.shop?.slug, 'tech-world', 'lands in own shop')
  // cleanup
  const del = await req(`/products/${productId}`, {
    method: 'DELETE',
    token: seller1
  })
  assert.equal(del.status, 200)
})
