// Hoi dap san pham: buyer hoi -> shop nhan thong bao + to-do -> shop tra loi -> buyer nhan thong bao,
// cau tra loi hien cong khai; gioi han cau hoi treo; quyen xoa.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf, waitFor, sleep } from './helpers.mjs'
import { prisma } from '../lib/db.js'

const admin = await login(ACCOUNTS.admin)
const seller = await login(ACCOUNTS.seller1) // chu tech-world
const seller2 = await login(ACCOUNTS.seller2)
const buyer = await login(ACCOUNTS.buyer)
const buyer2 = await login(ACCOUNTS.buyer2)
const p = await firstProductOf('tech-world')
const pid = BigInt(p.id)
const startedAt = new Date()

const ask = (token, question, id = p.id) =>
  req(`/products/${id}/questions`, { method: 'POST', token, body: { question } })
const list = () => req(`/products/${p.id}/questions?limit=50`)
const answer = (token, id, text) =>
  req(`/product-questions/${id}/answer`, { method: 'PUT', token, body: { answer: text } })

const clean = () => prisma.productQuestion.deleteMany({ where: { product_id: pid } })
await clean()
after(async () => {
  await clean()
  await prisma.notification.deleteMany({
    where: {
      created_at: { gte: startedAt },
      title: { in: ['New question about your product', 'The shop answered your question'] }
    }
  })
  await prisma.$disconnect()
})

let qid = null

test('validate: chua dang nhap 401, qua ngan/dai 400, chu shop 400, khong ton tai 404', async () => {
  assert.equal((await ask(undefined, 'Does it ship fast?')).status, 401)
  assert.equal((await ask(buyer, 'hi')).status, 400)
  assert.equal((await ask(buyer, 'x'.repeat(501))).status, 400)
  assert.equal((await ask(seller, 'Can I ask myself?')).status, 400)
  assert.equal((await ask(buyer, 'Is this in stock?', 999999999)).status, 404)
})

test('buyer hoi -> 201, hien cong khai, chu shop nhan thong bao va to-do', async () => {
  const r = await ask(buyer, '  Does this come with a charger?  ')
  assert.equal(r.status, 201, JSON.stringify(r.json))
  assert.equal(r.json.data.question, 'Does this come with a charger?')
  assert.equal(r.json.data.answer, null)
  qid = r.json.data.id

  const l = await list()
  assert.equal(l.status, 200)
  assert.ok(l.json.data.questions.some(q => q.id === qid))
  assert.equal(l.json.data.pagination.total_count, 1)

  const owner = await prisma.shop.findFirst({ where: { slug: 'tech-world' }, select: { owner_id: true } })
  const n = await waitFor(() => prisma.notification.findFirst({
    where: { user_id: owner.owner_id, title: 'New question about your product', created_at: { gte: startedAt } }
  }))
  assert.ok(n, 'chu shop khong nhan thong bao')
  assert.equal(n.link, '/seller/questions?filter=unanswered')

  const todo = await req('/dashboard/shop/todo', { token: seller })
  assert.ok(todo.json.data.unanswered_questions >= 1, JSON.stringify(todo.json))
})

test('toi da 3 cau chua tra loi moi nguoi moi san pham -> 429', async () => {
  assert.equal((await ask(buyer, 'Second question here?')).status, 201)
  assert.equal((await ask(buyer, 'Third question here?')).status, 201)
  assert.equal((await ask(buyer, 'Fourth question here?')).status, 429)
  // nguoi khac van hoi duoc
  assert.equal((await ask(buyer2, 'Is there a warranty?')).status, 201)
})

test('shop khac/buyer khong tra loi duoc; chu shop tra loi -> buyer nhan thong bao', async () => {
  assert.equal((await answer(buyer, qid, 'Yes it does')).status, 403)
  assert.equal((await answer(seller2, qid, 'Yes it does')).status, 404)
  assert.equal((await answer(seller, qid, 'no')).status, 400)
  const r = await answer(seller, qid, 'Yes, a 65W charger is included.')
  assert.equal(r.status, 200, JSON.stringify(r.json))
  assert.equal(r.json.data.answer, 'Yes, a 65W charger is included.')

  // cau da tra loi len dau danh sach
  const l = await list()
  assert.equal(l.json.data.questions[0].id, qid)

  const buyerRow = await prisma.user.findUnique({ where: { email: ACCOUNTS.buyer } })
  const n = await waitFor(() => prisma.notification.findFirst({
    where: { user_id: buyerRow.id, title: 'The shop answered your question', created_at: { gte: startedAt } }
  }))
  assert.ok(n, 'nguoi hoi khong nhan thong bao')
  assert.match(n.link, new RegExp(`^/product/.+-p${p.id}#questions$`))

  // sua cau tra loi: khong bao lai
  assert.equal((await answer(seller, qid, 'Yes, 65W USB-C charger included.')).status, 200)
  await sleep(300) // cho thong bao (neu lo gui lai) kip ghi, roi moi dem
  const count = await prisma.notification.count({
    where: { user_id: buyerRow.id, title: 'The shop answered your question', created_at: { gte: startedAt } }
  })
  assert.equal(count, 1)
})

test('hop thu shop loc unanswered', async () => {
  const all = await req('/product-questions/shop/mine?limit=50', { token: seller })
  assert.equal(all.status, 200)
  const mine = all.json.data.questions.filter(q => String(q.product.id) === String(p.id))
  assert.equal(mine.length, 4)
  const open = await req('/product-questions/shop/mine?filter=unanswered&limit=50', { token: seller })
  assert.ok(open.json.data.questions.every(q => q.answer === null))
  assert.ok(!open.json.data.questions.some(q => q.id === qid))
  assert.equal((await req('/product-questions/shop/mine', { token: buyer })).status, 403)
})

test('xoa: nguoi khac 404, nguoi hoi xoa duoc, admin xoa duoc', async () => {
  const others = (await list()).json.data.questions.filter(q => q.id !== qid)
  const own = others.find(q => q.question === 'Second question here?')
  assert.equal((await req(`/product-questions/${own.id}`, { method: 'DELETE', token: buyer2 })).status, 404)
  assert.equal((await req(`/product-questions/${own.id}`, { method: 'DELETE', token: buyer })).status, 200)
  assert.equal((await req(`/product-questions/${qid}`, { method: 'DELETE', token: admin })).status, 200)
  assert.equal((await list()).json.data.pagination.total_count, 2)
})
