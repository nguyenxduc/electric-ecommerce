import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)
const buyer = await login(ACCOUNTS.buyer)

test('public product list includes the selling shop', async () => {
  const res = await req('/products?limit=3')
  assert.equal(res.status, 200)
  const products = res.json?.products || []
  assert.ok(products.length > 0)
  assert.ok(products.every(p => p.shop?.slug), 'every product carries shop info')
})

test('seller product CRUD on their own shop', async () => {
  // use a category that actually exists (ids are not stable across reseeds)
  const categoryId = (await firstProductOf('tech-world'))?.category_id
  const created = await req('/products', {
    method: 'POST',
    token: seller1,
    body: {
      name: 'Test Gadget X1',
      price: 49.99,
      quantity: 5,
      category_id: categoryId,
      description: 'suite-created product'
    }
  })
  assert.equal(created.status, 201, JSON.stringify(created.json).slice(0, 150))
  const id = created.json?.product?.id

  const updated = await req(`/products/${id}`, {
    method: 'PATCH',
    token: seller1,
    body: { price: 59.99 }
  })
  assert.equal(updated.status, 200)
  assert.equal(Number(updated.json?.product?.price), 59.99)

  const mine = await req('/products/shop/mine?search=Test Gadget X1', {
    token: seller1
  })
  assert.ok(
    (mine.json?.products || []).some(p => p.id === id),
    'appears in seller product list'
  )

  const deleted = await req(`/products/${id}`, { method: 'DELETE', token: seller1 })
  assert.equal(deleted.status, 200)
  assert.equal((await req(`/products/${id}`)).status, 404, 'soft-deleted')
})

test('admin must name a target shop when creating a product', async () => {
  const categoryId = (await firstProductOf('tech-world'))?.category_id
  const res = await req('/products', {
    method: 'POST',
    token: admin,
    body: { name: 'Orphan Product', price: 5, quantity: 1, category_id: categoryId }
  })
  assert.equal(res.status, 400)
})

test('suspending a shop hides its products everywhere buyers look', async () => {
  const ghProduct = await firstProductOf('gadget-hub')
  const twProduct = await firstProductOf('tech-world')
  const shops = (await req('/shops/admin/all?search=gadget', { token: admin }))
    .json?.data?.shops
  const gh = shops.find(s => s.slug === 'gadget-hub')

  await req(`/shops/admin/${gh.id}/suspend`, {
    method: 'PATCH',
    token: admin,
    body: { reason: 'visibility test' }
  })

  try {
    // catalog list
    const list = (await req('/products?limit=100')).json?.products || []
    assert.ok(
      !list.some(p => p.shop?.slug === 'gadget-hub'),
      'catalog list excludes suspended shop'
    )
    // detail
    assert.equal((await req(`/products/${ghProduct.id}`)).status, 404, 'detail hidden')
    // search
    const search = (await req(`/products/search?query=${encodeURIComponent(ghProduct.name.split(' ')[0])}`)).json?.products || []
    assert.ok(!search.some(p => p.id === ghProduct.id), 'search excludes it')
    // add to cart
    const cartAdd = await req(`/cart/add_item/${ghProduct.id}`, {
      method: 'POST',
      token: buyer,
      body: { quantity: 1 }
    })
    assert.equal(cartAdd.status, 404, 'cart-add rejects it')
    // AI comparison
    const cmp = await req('/products/compare-ai', {
      method: 'POST',
      body: { ids: [ghProduct.id, twProduct.id] }
    })
    assert.equal(cmp.status, 404, 'comparison rejects it')
    // admin still sees it (moderation needs eyes on hidden goods)
    const adminList = (await req('/products?limit=100', { token: admin })).json?.products || []
    assert.ok(adminList.some(p => p.id === ghProduct.id), 'admin still sees it')
  } finally {
    await req(`/shops/admin/${gh.id}/approve`, { method: 'PATCH', token: admin })
  }

  assert.equal((await req(`/products/${ghProduct.id}`)).status, 200, 'visible again')
})

test('shop product listing paginates and sorts', async () => {
  const asc = (await req('/shops/tech-world/products?limit=5&sort=price-asc')).json
  const prices = (asc?.products || []).map(p => Number(p.price))
  assert.ok(prices.length > 0)
  const sorted = prices.every((v, i) => i === 0 || prices[i - 1] <= v)
  assert.ok(sorted, `prices not ascending: ${prices}`)
  assert.ok(asc?.pagination?.total_count >= prices.length)
})
