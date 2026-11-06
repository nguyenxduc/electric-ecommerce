import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'

const admin = await login(ACCOUNTS.admin)
const seller2 = await login(ACCOUNTS.seller2)
const applicant = await login(ACCOUNTS.applicant)

test('public shop list returns only active shops', async () => {
  const res = await req('/shops')
  assert.equal(res.status, 200)
  const shops = res.json?.data?.shops || []
  assert.ok(shops.length >= 2)
  assert.ok(shops.every(s => s.status === 'active'))
})

test('active shop profile is public; pending shop is hidden', async () => {
  assert.equal((await req('/shops/tech-world')).status, 200)
  assert.equal((await req('/shops/new-corner-store')).status, 404)
})

test('admin can preview a pending shop', async () => {
  const res = await req('/shops/new-corner-store', { token: admin })
  assert.equal(res.status, 200)
  assert.equal(res.json?.data?.status, 'pending')
})

test('shop application lifecycle: apply -> reject -> resubmit -> approve', async () => {
  // apply
  const applied = await req('/shops/apply', {
    method: 'POST',
    token: applicant,
    body: { name: 'Charlie Corner', description: 'Test application' }
  })
  assert.equal(applied.status, 201, JSON.stringify(applied.json).slice(0, 150))
  const shopId = applied.json?.data?.id
  assert.equal(applied.json?.data?.status, 'pending')

  // a second application from the same user is rejected
  const dup = await req('/shops/apply', {
    method: 'POST',
    token: applicant,
    body: { name: 'Another One' }
  })
  assert.equal(dup.status, 400)

  // admin rejects with a reason
  const rejected = await req(`/shops/admin/${shopId}/reject`, {
    method: 'PATCH',
    token: admin,
    body: { reason: 'Missing tax info' }
  })
  assert.equal(rejected.status, 200)
  assert.equal(rejected.json?.data?.status, 'rejected')

  // applicant edits their shop -> auto-resubmits to pending
  const resubmitted = await req('/shops/me', {
    method: 'PATCH',
    token: applicant,
    body: { description: 'Now with tax info' }
  })
  assert.equal(resubmitted.status, 200)
  assert.equal(resubmitted.json?.data?.status, 'pending')

  // admin approves -> shop active, owner promoted to seller
  const approved = await req(`/shops/admin/${shopId}/approve`, {
    method: 'PATCH',
    token: admin
  })
  assert.equal(approved.status, 200)
  assert.equal(approved.json?.data?.status, 'active')

  const me = await req('/auth/me', { token: applicant })
  assert.equal(me.json?.data?.role, 'seller', 'owner promoted to seller')

  // shop is now publicly visible
  const slug = approved.json?.data?.slug
  assert.equal((await req(`/shops/${slug}`)).status, 200)

  // applicant received a notification about the approval
  const notis = await req('/notifications?limit=10', { token: applicant })
  const titles = (notis.json?.data?.notifications || []).map(n => n.title)
  assert.ok(
    titles.some(t => /approved/i.test(t)),
    `expected an approval notification, got: ${titles.join(' | ')}`
  )
})

test('suspend hides the shop and admin can re-approve', async () => {
  const shops = (await req('/shops/admin/all?search=gadget', { token: admin }))
    .json?.data?.shops
  const gh = shops.find(s => s.slug === 'gadget-hub')

  const suspended = await req(`/shops/admin/${gh.id}/suspend`, {
    method: 'PATCH',
    token: admin,
    body: { reason: 'test suspension' }
  })
  assert.equal(suspended.status, 200)

  // hidden from the public, but the owner can still see their own shop
  assert.equal((await req('/shops/gadget-hub')).status, 404)
  const own = await req('/shops/me', { token: seller2 })
  assert.equal(own.status, 200)
  assert.equal(own.json?.data?.status, 'suspended')

  // restore
  const restored = await req(`/shops/admin/${gh.id}/approve`, {
    method: 'PATCH',
    token: admin
  })
  assert.equal(restored.status, 200)
  assert.equal((await req('/shops/gadget-hub')).status, 200)
})

test('seller updates own shipping overrides (blank = platform default)', async () => {
  const updated = await req('/shops/me', {
    method: 'PATCH',
    token: seller2,
    body: { shipping_fee_override: 3.5, free_shipping_threshold_override: 120 }
  })
  assert.equal(updated.status, 200)
  assert.equal(Number(updated.json?.data?.shipping_fee_override), 3.5)

  // restore seeded values so later suites compute expected shipping correctly
  const restored = await req('/shops/me', {
    method: 'PATCH',
    token: seller2,
    body: { shipping_fee_override: 4.99, free_shipping_threshold_override: 150 }
  })
  assert.equal(Number(restored.json?.data?.shipping_fee_override), 4.99)
})

test('shop profile aggregates product count and rating', async () => {
  const res = await req('/shops/tech-world')
  assert.equal(res.status, 200)
  const shop = res.json?.data
  assert.ok(shop._count?.products > 0, 'has products')
  assert.ok('rating' in shop && 'review_count' in shop)
})
