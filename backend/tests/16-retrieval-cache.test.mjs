import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { pickConfidentSubset, retrieveHybrid } from '../ai/retrieval.js'
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
