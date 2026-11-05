// Metrics middleware + GET /api/health.
//
// Phan percentile la unit test thuan, khong can backend. Phan /api/health can
// backend dang chay (nhu moi file test khac trong thu muc nay).
import test from 'node:test'
import assert from 'node:assert/strict'
import { percentile } from '../lib/stats.js'
import { req, login, ACCOUNTS } from './helpers.mjs'

// Quy uoc duoc kiem o day la "nearest-rank-above": voi mang da sap xep tang do
// dai n, p-percentile la phan tu o chi so 0-based floor(p/100 * n) - tuc la
// LUON nhay len hang ke tiep ke ca khi p/100*n tron, chu khong phai quy uoc
// ceil(p/100*n)-1 hay noi suy tuyen tinh kieu numpy.
//
// Cac gia tri mong doi duoi day duoc tinh tay tu dinh nghia do:
//   [7], p95        -> n=1, floor(0.95*1)=floor(0.95)=0 -> phan tu thu 1  = 7
//   [1..10], p50    -> n=10, floor(0.5*10)=5            -> phan tu thu 6  = 6
//   [1..10], p95    -> n=10, floor(0.95*10)=floor(9.5)=9 -> phan tu thu 10 = 10
// Luu y p50 cua [1..10] la 6 chu khong phai 5: day chinh la cho quy uoc nay
// khac cac quy uoc percentile khac.

const TEN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

test('percentile: mang rong tra ve 0', () => {
  assert.equal(percentile([], 50), 0)
})

test('percentile: mang mot phan tu tra ve chinh phan tu do', () => {
  assert.equal(percentile([7], 95), 7)
})

test('percentile: p50 cua [1..10] la 6 (nearest-rank-above, khong phai 5)', () => {
  assert.equal(percentile(TEN, 50), 6)
})

test('percentile: p95 cua [1..10] la 10', () => {
  assert.equal(percentile(TEN, 95), 10)
})

test('GET /api/health: admin nhan du uptime/routes/errors_5xx_total/ai_calls_today', async () => {
  const admin = await login(ACCOUNTS.admin)
  const res = await req('/health', { token: admin })
  assert.equal(res.status, 200, JSON.stringify(res.json).slice(0, 200))

  const data = res.json.data
  assert.equal(typeof data.uptime_s, 'number')
  assert.ok(Array.isArray(data.routes), 'routes phai la mang')
  assert.equal(typeof data.errors_5xx_total, 'number')
  assert.equal(typeof data.ai_calls_today, 'number')
})

test('/api/health chi danh cho admin', async () => {
  const buyer = await login(ACCOUNTS.buyer)
  const seller = await login(ACCOUNTS.seller1)

  assert.equal((await req('/health', { token: buyer })).status, 403)
  assert.equal((await req('/health', { token: seller })).status, 403)
  assert.equal((await req('/health')).status, 401)
})

test('metrics gom theo MAU route, khong giu id that trong khoa', async () => {
  const admin = await login(ACCOUNTS.admin)
  // Goi mot URL co id cu the; khoa duoc ghi phai la "/api/products/:id".
  await req('/products/999999999')

  const { routes } = (await req('/health', { token: admin })).json.data
  const keys = routes.map(r => r.route)
  assert.ok(
    keys.some(k => k.includes('/api/products/:id')),
    `khong thay mau route /api/products/:id trong ${JSON.stringify(keys)}`
  )
  // Mot khoa chua segment so la bang chung metrics da ghi URL that vao bo nho
  // (va se ghi tiep vao log alert) - dung cho nguy hiem ma middleware nay phai
  // tranh.
  const leaked = keys.filter(k => /\/\d/.test(k))
  assert.deepEqual(leaked, [], 'khoa route khong duoc chua id that')
})
