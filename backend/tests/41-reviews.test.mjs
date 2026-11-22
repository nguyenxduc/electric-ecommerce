// Danh gia kieu Shopee: anh dinh kem, loc theo sao / co anh, seller tra loi.
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { API, req, login, ACCOUNTS } from './helpers.mjs'
import { prisma } from '../lib/db.js'

const seller1 = await login(ACCOUNTS.seller1) // Tech World
const seller2 = await login(ACCOUNTS.seller2) // Gadget Hub
const buyer = await login(ACCOUNTS.buyer)

const product = await prisma.product.findFirst({
  where: { shop: { slug: 'tech-world' }, deleted_at: null },
  orderBy: { id: 'asc' }
})
const [jane, john] = await Promise.all(
  [ACCOUNTS.buyer, ACCOUNTS.buyer2].map(email => prisma.user.findUnique({ where: { email } }))
)
const IMG = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
let withPhoto, plain

before(async () => {
  // Tao thang trong DB: khong can don giao + khong goi AI kiem duyet / Cloudinary
  withPhoto = await prisma.review.create({
    data: { user_id: jane.id, product_id: product.id, rating: 5, comment: 'test41 photo', images: [IMG] }
  })
  plain = await prisma.review.create({
    data: { user_id: john.id, product_id: product.id, rating: 2, comment: 'test41 plain' }
  })
})

after(async () => {
  await prisma.review.deleteMany({ where: { id: { in: [withPhoto.id, plain.id] } } })
  await prisma.notification.deleteMany({ where: { user_id: jane.id, link: { endsWith: `-p${product.id}#reviews` } } })
  await prisma.$disconnect()
})

const reply = (id, token, body = { reply: 'Thanks!' }, method = 'PUT') =>
  req(`/reviews/${id}/reply`, { method, token, body })

test('only the owning seller can reply; length is validated', async () => {
  assert.equal((await reply(withPhoto.id, seller2)).status, 404)
  assert.equal((await reply(withPhoto.id, buyer)).status, 403)
  assert.equal((await reply(withPhoto.id, seller1, { reply: '   ' })).status, 400)
  assert.equal((await reply(withPhoto.id, seller1, { reply: 'x'.repeat(1001) })).status, 400)

  const ok = await reply(withPhoto.id, seller1, { reply: 'Thank you for the photo!' })
  assert.equal(ok.status, 200, JSON.stringify(ok.json))
  assert.equal(ok.json.review.seller_reply, 'Thank you for the photo!')
  assert.ok(ok.json.review.seller_reply_at)

  // Sua duoc
  const edited = await reply(withPhoto.id, seller1, { reply: 'Edited reply' })
  assert.equal(edited.json.review.seller_reply, 'Edited reply')

  // Nguoi mua nhan duoc mot thong bao (lan tra loi dau) co link toi tab danh gia
  const notes = await prisma.notification.count({
    where: { user_id: jane.id, link: { endsWith: `-p${product.id}#reviews` } }
  })
  assert.equal(notes, 1)
})

test('product list filters by rating and photos and returns images + reply', async () => {
  const list = async q => (await req(`/reviews/product/${product.id}?limit=100${q}`)).json
  const ids = r => r.reviews.map(x => String(x.id))

  const photos = await list('&has_images=true')
  assert.ok(ids(photos).includes(String(withPhoto.id)))
  assert.ok(!ids(photos).includes(String(plain.id)))
  assert.ok(photos.reviews.every(r => r.images.length > 0))
  const mine = photos.reviews.find(r => String(r.id) === String(withPhoto.id))
  assert.deepEqual(mine.images, [IMG])
  assert.equal(mine.seller_reply, 'Edited reply')

  const two = await list('&rating=2')
  assert.ok(ids(two).includes(String(plain.id)))
  assert.ok(two.reviews.every(r => r.rating === 2))
  // summary luon la tong cua san pham, khong theo bo loc
  assert.ok(two.summary.total_reviews >= two.pagination.total_count)

  const stats = (await req(`/reviews/product/${product.id}/stats`)).json
  assert.equal(stats.withImages, photos.pagination.total_count)
})

test('seller review inbox lists own reviews and filters unreplied', async () => {
  const unreplied = (await req('/reviews/shop/mine?filter=unreplied&limit=100', { token: seller1 })).json
  const ids = unreplied.reviews.map(r => String(r.id))
  assert.ok(ids.includes(String(plain.id)))
  assert.ok(!ids.includes(String(withPhoto.id)))
  assert.ok(unreplied.reviews.every(r => r.seller_reply === null && r.product.name))

  const other = (await req('/reviews/shop/mine?limit=100', { token: seller2 })).json
  assert.ok(!other.reviews.some(r => String(r.id) === String(plain.id)))
  assert.equal((await req('/reviews/shop/mine', { token: buyer })).status, 403)

  const todo = (await req('/dashboard/shop/todo', { token: seller1 })).json.data
  assert.equal(todo.unreplied_reviews, unreplied.pagination.total_count)
})

test('seller can remove a reply', async () => {
  assert.equal((await reply(withPhoto.id, seller2, undefined, 'DELETE')).status, 404)
  const res = await reply(withPhoto.id, seller1, undefined, 'DELETE')
  assert.equal(res.status, 200)
  assert.equal(res.json.review.seller_reply, null)
})

test('review image upload rejects non-image files', async () => {
  const form = new FormData()
  form.append('productId', String(product.id))
  form.append('rating', '5')
  form.append('images', new Blob(['hello'], { type: 'text/plain' }), 'note.txt')
  const res = await fetch(`${API}/reviews`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyer}`, 'X-Device-Id': 'test-41' },
    body: form
  })
  assert.equal(res.status, 400)
  assert.match((await res.json()).message, /JPG, PNG or WebP/)
})
