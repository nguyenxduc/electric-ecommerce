import test from 'node:test'
import assert from 'node:assert/strict'
import { req, API } from './helpers.mjs'

// Hop dong o tang ha tang, dat ra trong dot refactor:
//   - moi loi tra ve cung mot dinh dang { success: false, error }
//   - endpoint la tra 404 JSON, khong phai trang HTML mac dinh cua Express
//   - ID sai dinh dang bi chan tu tang route voi 400, khong de roi xuong
//     controller roi bien thanh 500 kem thong bao loi noi bo

test('endpoint khong ton tai tra 404 dang JSON', async () => {
  const res = await req('/khong-ton-tai-dau')
  assert.equal(res.status, 404)
  assert.equal(res.json?.success, false)
  assert.ok(res.json?.error, 'thieu truong error')
})

test('body JSON hong tra 400 dung dinh dang, khong phai HTML', async () => {
  const res = await fetch(API + '/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"code": hong'
  })
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body?.success, false)
})

test('ID sai dinh dang bi chan bang 400 chu khong phai 500', async () => {
  const badIds = ['khong-phai-so', '0', '-5', 'abc123', '1.5']
  for (const bad of badIds) {
    const res = await req(`/products/${encodeURIComponent(bad)}`)
    assert.equal(res.status, 400, `/products/${bad} tra ve ${res.status}`)
    assert.equal(res.json?.success, false)
  }
})

test('thong bao loi khong lo chi tiet noi bo ra ngoai', async () => {
  const res = await req('/products/khong-phai-so')
  const error = String(res.json?.error ?? '')
  assert.doesNotMatch(
    error,
    /BigInt|prisma|stack|at\s+\w+\s+\(/i,
    `thong bao loi lo chi tiet noi bo: ${error}`
  )
})

test('guard ID ap dung cho nhieu router, khong chi products', async () => {
  const routes = ['/products/abc', '/categories/abc', '/reviews/abc']
  for (const path of routes) {
    const res = await req(path)
    assert.equal(res.status, 400, `${path} tra ve ${res.status}`)
  }
})

test('ID hop le van hoat dong binh thuong', async () => {
  const list = await req('/shops/tech-world/products?limit=1')
  const id = list.json?.products?.[0]?.id
  assert.ok(id, 'khong lay duoc san pham mau')

  const res = await req(`/products/${id}`)
  assert.equal(res.status, 200, `san pham that tra ve ${res.status}`)
})

test('route dung slug hoac key khong bi guard chan nham', async () => {
  // Guard chi ap cho param dang so; `slug` va `key` la chuoi.
  const textRoutes = [
    '/shops/tech-world',
    '/shops/tech-world/products?limit=1',
    '/coupons/shop/tech-world',
    '/settings/public'
  ]
  for (const path of textRoutes) {
    const res = await req(path)
    assert.equal(res.status, 200, `${path} bi chan nham (${res.status})`)
  }
})
