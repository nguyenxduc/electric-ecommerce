// Bao giam gia cho wishlist: seller ha gia ban thuc te -> nguoi co san pham trong wishlist nhan PROMO;
// tang gia khong bao; trong 24h khong bao lap.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

const seller = await login(ACCOUNTS.seller1) // chu tech-world
const buyer = await login(ACCOUNTS.buyer2)
const p = await firstProductOf('tech-world')
const pid = BigInt(p.id)
const buyerRow = await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer2 } })
const original = await prisma.product.findUnique({
  where: { id: pid },
  select: { price: true, discount: true, flash_discount: true, flash_starts_at: true, flash_ends_at: true }
})
const startedAt = new Date()
const TITLE = 'Price drop on your wishlist'

const patch = body => req(`/products/${p.id}`, { method: 'PATCH', token: seller, body })
const alerts = () =>
  prisma.notification.findMany({
    where: { user_id: buyerRow.id, title: TITLE, created_at: { gte: startedAt } }
  })
const waitFor = async (pred, tries = 20) => {
  for (let i = 0; i < tries; i++) {
    if (await pred()) return true
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}

// Xoa thong bao PROMO cu cua san pham de dedupe 24h khong che test
await prisma.notification.deleteMany({ where: { type: 'PROMO', link: { endsWith: `-p${p.id}` } } })
after(async () => {
  await prisma.notification.deleteMany({ where: { type: 'PROMO', created_at: { gte: startedAt } } })
  await prisma.product.update({ where: { id: pid }, data: original })
  await req(`/wishlist/remove/${p.id}`, { method: 'DELETE', token: buyer })
  await prisma.$disconnect()
})

test('tang gia: khong bao', async () => {
  const add = await req('/wishlist/add', { method: 'POST', token: buyer, body: { productId: p.id } })
  assert.ok([200, 201, 400, 409].includes(add.status), JSON.stringify(add.json))
  const res = await patch({ discount: 0, price: Number(original.price) + 10 })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  await new Promise(r => setTimeout(r, 400))
  assert.equal((await alerts()).length, 0)
})

test('giam gia: nguoi trong wishlist nhan thong bao co link san pham', async () => {
  const res = await patch({ price: Number(original.price), discount: 5 })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.ok(await waitFor(async () => (await alerts()).length === 1), 'khong co thong bao giam gia')
  const [n] = await alerts()
  assert.equal(n.type, 'PROMO')
  assert.match(n.link, new RegExp(`^/product/.+-p${p.id}$`))
})

test('giam them trong 24h: khong bao lap', async () => {
  const res = await patch({ discount: 8 })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  await new Promise(r => setTimeout(r, 400))
  assert.equal((await alerts()).length, 1)
})
