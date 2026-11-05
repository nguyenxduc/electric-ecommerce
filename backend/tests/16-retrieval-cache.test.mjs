import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { isLexicalDecisive, pickConfidentSubset, retrieveHybrid } from '../ai/retrieval.js'
import { needsTools } from '../ai/agent.js'

// T7: cache thu hang truy hoi de ha TTFT, nhung gia/ton kho KHONG duoc cache -
// phai doc lai tuoi moi lan. Bai duoi day chung minh dung bat bien do bang
// cach doi gia that giua hai lan goi retrieveHybrid cung mot cau hoi.
//
// Yeu cau du lieu: da chay "npm run seed".

test('retrieveHybrid: cache hit van tra ve gia moi nhat, khong phai gia cu', async () => {
  const product = await prisma.product.findFirst({
    where: { deleted_at: null },
    orderBy: { id: 'asc' }
  })
  assert.ok(product, 'can it nhat mot san pham da seed de chay test nay')

  const question = product.name
  const first = await retrieveHybrid(prisma, question, { topK: 5 })
  assert.ok(first.some(r => String(r.id) === String(product.id)), 'lan goi dau phai tim thay san pham')

  const bumped = Number(product.price) + 123
  await prisma.product.update({
    where: { id: product.id },
    data: { price: bumped }
  })

  try {
    const second = await retrieveHybrid(prisma, question, { topK: 5 })
    const row = second.find(r => String(r.id) === String(product.id))
    assert.ok(row, 'lan goi thu hai (cache hit thu hang) van phai tra ve san pham')
    assert.equal(Number(row.price), bumped, 'gia phai la gia MOI, khong duoc lay tu cache')
  } finally {
    await prisma.product.update({
      where: { id: product.id },
      data: { price: product.price }
    })
  }
})

test('needsTools: khong co ngu canh thi luon can cong cu', () => {
  assert.equal(needsTools('con hang khong', []), true)
})

test('needsTools: hoi mau/ship thi can cong cu du da co ngu canh', () => {
  const ctx = [{ id: 1 }]
  assert.equal(needsTools('con mau do khong shop', ctx), true)
  assert.equal(needsTools('phi ship bao nhieu', ctx), true)
})

test('needsTools: hoi thang vao gia/thong so voi ngu canh san co thi khong can cong cu', () => {
  const ctx = [{ id: 1 }]
  assert.equal(needsTools('may nay gia bao nhieu', ctx), false)
})

test('pickConfidentSubset: ca 3 nhanh dong y hang 1 thi cat con 2, khong thi giu nguyen', () => {
  const allAgree = [
    { id: 1, _sources: ['fulltext', 'vector', 'trigram'] },
    { id: 2, _sources: ['fulltext'] },
    { id: 3, _sources: ['vector'] }
  ]
  assert.equal(pickConfidentSubset(allAgree).length, 2)

  const notUnanimous = [
    { id: 1, _sources: ['fulltext', 'vector'] },
    { id: 2, _sources: ['vector', 'trigram'] },
    { id: 3, _sources: ['fulltext'] }
  ]
  assert.equal(pickConfidentSubset(notUnanimous).length, 3)
})

// Cong tu khoa (T7): ten san pham thi bo luot goi API nhung, cau theo nhu cau
// thi van phai goi. Moi cau them Date.now() de khong trung khoa cache thu hang
// (cache hit thi khong chay nhanh nao, dem so lan goi se sai).
test('retrieveHybrid: goi dung ten san pham thi khong goi API nhung', async () => {
  const product = await prisma.product.findFirst({
    where: { deleted_at: null, name: { contains: 'XPS' } }
  })
  assert.ok(product, 'can san pham Dell XPS trong seed')
  let calls = 0
  const rows = await retrieveHybrid(prisma, product.name + ' gia bao nhieu ' + Date.now(), {
    topK: 5,
    embedQuery: async () => { calls += 1; return [] }
  })
  assert.equal(calls, 0, 'full-text va trigram da dong thuan, khong duoc goi nhung')
  assert.equal(String(rows[0]?.id), String(product.id))
})

test('retrieveHybrid: cau hoi theo nhu cau van goi API nhung', async () => {
  let calls = 0
  await retrieveHybrid(prisma, 'tu van dien thoai chup anh dep ' + Date.now(), {
    topK: 5,
    embedQuery: async () => { calls += 1; return [] }
  })
  assert.equal(calls, 1)
})

test('isLexicalDecisive: can ca hai nhanh tu khoa VA ten khop >= 2 token', () => {
  const both = [{ sources: ['fulltext', 'trigram'] }]
  assert.equal(isLexicalDecisive(both, ['dell', 'xps', '15', 'gia'], 'Dell XPS 15 9530'), true)
  assert.equal(isLexicalDecisive(both, ['iphon', '15', 'pro'], 'iPhone 15 Pro'), true, 'loi go thieu chu van khop tien to')
  // Mot chu thuong hieu thoi khong du: day la cau hoi phu kien, vector moi tim ra.
  assert.equal(isLexicalDecisive(both, ['sac', 'nhanh', 'cho', 'iphone'], 'iPhone 15 Pro Max'), false)
  assert.equal(isLexicalDecisive([{ sources: ['fulltext'] }], ['dell', 'xps'], 'Dell XPS 15'), false)
  // Phu kien / so sanh: nhac ten may nhung dang tim thu khac.
  assert.equal(isLexicalDecisive(both, ['op', 'lung', 'iphone', '15'], 'iPhone 15'), false)
  assert.equal(isLexicalDecisive(both, ['sac', 'samsung', 'galaxy', 's24'], 'Samsung Galaxy S24'), false)
  assert.equal(isLexicalDecisive(both, ['so', 'sanh', 'iphone', '15', 'galaxy', 's24'], 'iPhone 15'), false)
  // Tu hoi gia khong lam giam ty le khop.
  assert.equal(isLexicalDecisive(both, ['canon', 'eos', 'r5', 'chup', 'anh', 'the', 'nao'], 'Canon EOS R5'), true)
  assert.equal(isLexicalDecisive([]), false)
})

test('pickConfidentSubset: bo qua vector thi 2/2 nhanh dong y la du de cat', () => {
  const gated = [
    { id: 1, _sources: ['fulltext', 'trigram'], _vectorSkipped: true },
    { id: 2, _sources: ['fulltext'], _vectorSkipped: true },
    { id: 3, _sources: ['fulltext'], _vectorSkipped: true }
  ]
  assert.equal(pickConfidentSubset(gated).length, 2)
  // Co chay vector ma hang 1 chi duoc 2 nhanh chon thi KHONG cat (hanh vi cu).
  const ranVector = gated.map(r => ({ ...r, _vectorSkipped: false }))
  assert.equal(pickConfidentSubset(ranVector).length, 3)
})
