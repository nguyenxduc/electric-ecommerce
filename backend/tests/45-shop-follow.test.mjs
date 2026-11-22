import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'

// Theo doi shop: idempotent, dem follower, is_following, bo theo doi, chan shop cua minh.

const buyer = await login(ACCOUNTS.buyer)
const seller1 = await login(ACCOUNTS.seller1) // chu tech-world
const SLUG = 'tech-world'

const shop = token => req(`/shops/${SLUG}`, { token })

after(async () => {
  await req(`/shops/${SLUG}/follow`, { method: 'DELETE', token: buyer })
})

test('follow/unfollow bat buoc dang nhap', async () => {
  assert.equal((await req(`/shops/${SLUG}/follow`, { method: 'POST' })).status, 401)
  assert.equal((await req(`/shops/${SLUG}/follow`, { method: 'DELETE' })).status, 401)
  assert.equal((await req('/shops/following/mine')).status, 401)
})

test('chu shop khong theo doi shop cua minh -> 400', async () => {
  const r = await req(`/shops/${SLUG}/follow`, { method: 'POST', token: seller1 })
  assert.equal(r.status, 400)
})

test('shop khong ton tai -> 404', async () => {
  const r = await req('/shops/khong-co-shop-nay/follow', { method: 'POST', token: buyer })
  assert.equal(r.status, 404)
})

test('follow idempotent, dem follower va is_following', async () => {
  await req(`/shops/${SLUG}/follow`, { method: 'DELETE', token: buyer })
  const before = (await shop(buyer)).json.data
  assert.equal(before.is_following, false)
  assert.equal((await shop()).json.data.is_following, false)

  const a = await req(`/shops/${SLUG}/follow`, { method: 'POST', token: buyer })
  assert.equal(a.status, 200)
  assert.equal(a.json.data.follower_count, before.follower_count + 1)
  const b = await req(`/shops/${SLUG}/follow`, { method: 'POST', token: buyer })
  assert.equal(b.status, 200)
  assert.equal(b.json.data.follower_count, before.follower_count + 1)

  const after1 = (await shop(buyer)).json.data
  assert.equal(after1.is_following, true)
  assert.equal(after1.follower_count, before.follower_count + 1)

  const mine = await req('/shops/following/mine', { token: buyer })
  assert.equal(mine.status, 200)
  const found = mine.json.data.shops.find(s => s.slug === SLUG)
  assert.ok(found)
  assert.equal(typeof found.product_count, 'number')
  assert.ok(mine.json.data.pagination.total_count >= 1)
})

test('unfollow idempotent', async () => {
  const a = await req(`/shops/${SLUG}/follow`, { method: 'DELETE', token: buyer })
  assert.equal(a.status, 200)
  assert.equal(a.json.data.is_following, false)
  const b = await req(`/shops/${SLUG}/follow`, { method: 'DELETE', token: buyer })
  assert.equal(b.status, 200)
  assert.equal(b.json.data.follower_count, a.json.data.follower_count)
  const mine = await req('/shops/following/mine', { token: buyer })
  assert.ok(!mine.json.data.shops.some(s => s.slug === SLUG))
})
