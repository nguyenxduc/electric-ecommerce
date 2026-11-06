import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import {
  fuseByRRF,
  tokenize,
  searchFullText,
  searchTrigram,
  retrieveHybrid,
  RRF_K
} from '../ai/retrieval.js'

// Truy hoi lai: full-text + trigram + vector, hop nhat bang Reciprocal Rank
// Fusion. Cac bai o day chi cham hai nhanh chay tren cơ so du lieu, khong goi
// dich vu nhung ben ngoai, nen chay duoc ma khong ton chi phi API.
//
// Yeu cau du lieu: da chay "npm run seed".

test('RRF: tai lieu duoc nhieu nhanh cung tim thay thi len tren', () => {
  const fused = fuseByRRF([
    { key: 'fts', rows: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    { key: 'vec', rows: [{ id: 3 }, { id: 1 }] }
  ])

  // id 1: hang 1 o fts, hang 2 o vec.  id 3: hang 3 o fts, hang 1 o vec.
  // id 2: chi mot nhanh -> phai xep cuoi.
  assert.equal(fused[fused.length - 1].id, '2')
  assert.deepEqual(
    fused.slice(0, 2).map(f => f.id).sort(),
    ['1', '3']
  )
})

test('RRF: diem tinh dung theo cong thuc 1/(k+rank)', () => {
  const fused = fuseByRRF([{ key: 'a', rows: [{ id: 7 }] }])
  assert.ok(Math.abs(fused[0].score - 1 / (RRF_K + 1)) < 1e-12)
})

test('RRF: trong so cua tung nhanh duoc ton trong', () => {
  const fused = fuseByRRF([
    { key: 'manh', rows: [{ id: 'a' }], weight: 1 },
    { key: 'yeu', rows: [{ id: 'b' }], weight: 0.5 }
  ])
  assert.equal(fused[0].id, 'a')
  assert.ok(fused[0].score > fused[1].score)
})

test('RRF: bo qua ban ghi khong co id, khong nem loi', () => {
  const fused = fuseByRRF([{ key: 'a', rows: [{ id: null }, {}, { id: 5 }] }])
  assert.equal(fused.length, 1)
  assert.equal(fused[0].id, '5')
})

test('tokenize bo dau va loai token qua ngan', () => {
  assert.deepEqual(tokenize('Điện thoại Samsung A'), ['dien', 'thoai', 'samsung'])
})

test('full-text bat duoc ma may va so hieu dong san pham', async () => {
  // Day la kieu tu khoa ma tim kiem ngu nghia nam rat kem.
  const rows = await searchFullText(prisma, ['rtx', '4060'], 5)
  assert.ok(rows.length > 0, 'khong tim thay san pham nao chua RTX 4060')
})

test('trigram cuu duoc cau go sai chinh ta nhe', async () => {
  // Truoc khi co nhanh nay, "iphon" tra ve rong.
  const rows = await searchTrigram(prisma, ['iphon'], 5)
  assert.ok(rows.length > 0, '"iphon" khong ra ket qua nao')
  assert.match(rows[0].name, /iPhone/i)
})

test('go sai chinh ta van ra dung san pham qua duong hop nhat', async () => {
  for (const [cau, mong] of [
    ['iphon 15', /iPhone/i],
    ['macbok pro', /MacBook/i],
    ['samsng galaxy tab', /Galaxy Tab/i]
  ]) {
    const rows = await retrieveHybrid(prisma, cau, { topK: 3 })
    assert.ok(rows.length > 0, `"${cau}" khong ra ket qua`)
    assert.ok(
      rows.some(r => mong.test(r.name)),
      `"${cau}" khong tim thay san pham khop ${mong}`
    )
  }
})

test('ket qua co ghi ro nhanh nao tim ra, phuc vu do luong', async () => {
  const rows = await retrieveHybrid(prisma, 'dell xps 15', { topK: 3 })
  assert.ok(rows.length > 0)
  assert.ok(Array.isArray(rows[0]._sources))
  assert.ok(rows[0]._sources.length > 0)
})

test('chi tra san pham cua gian hang dang hoat dong', async () => {
  const rows = await retrieveHybrid(prisma, 'laptop', { topK: 10 })
  for (const r of rows) {
    const shop = await prisma.shop.findFirst({
      where: { name: r.shop_name },
      select: { status: true }
    })
    assert.equal(shop?.status, 'active', `lot san pham cua shop ${shop?.status}`)
  }
})

test.after(async () => {
  await prisma.$disconnect()
})
