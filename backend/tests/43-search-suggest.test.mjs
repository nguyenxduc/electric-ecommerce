import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'

// Goi y o tim kiem: san pham + danh muc + gian hang, q rong -> trending.

const suggest = async q => {
  const res = await req(`/products/suggest?q=${encodeURIComponent(q)}`)
  assert.equal(res.status, 200)
  return res.json
}

test('"lap" goi y laptop va danh muc Laptops', async () => {
  const r = await suggest('lap')
  assert.ok(r.products.length > 0 && r.products.length <= 6)
  assert.ok(r.products.some(p => /asus rog/i.test(p.name)), r.products.map(p => p.name).join(', '))
  assert.ok(r.categories.some(c => /laptops/i.test(c.name)))
  assert.ok(r.products.every(p => p.id && 'final_price' in p && 'img' in p))
})

test('"tech" goi y gian hang Tech World', async () => {
  const r = await suggest('tech')
  assert.ok(r.shops.some(s => /tech world/i.test(s.name)))
})

test('san pham bi an khong bao gio duoc goi y', async () => {
  const seller1 = await login(ACCOUNTS.seller1)
  const p = await firstProductOf('tech-world')
  const toggle = is_active =>
    req(`/products/${p.id}/visibility`, { method: 'PATCH', token: seller1, body: { is_active } })
  assert.equal((await toggle(false)).status, 200)
  try {
    const r = await suggest(p.name)
    assert.ok(!r.products.some(x => x.id === Number(p.id)))
  } finally {
    await toggle(true)
  }
  assert.ok((await suggest(p.name)).products.some(x => x.id === Number(p.id)))
})

test('q rong tra ve trending', async () => {
  const r = await suggest('')
  assert.ok(Array.isArray(r.trending) && r.trending.length > 0 && r.trending.length <= 8)
})

test('q > 100 ky tu bi tu choi 400', async () => {
  const res = await req(`/products/suggest?q=${'a'.repeat(101)}`)
  assert.equal(res.status, 400)
})
