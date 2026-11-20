import test from 'node:test'
import assert from 'node:assert/strict'
import { req } from './helpers.mjs'

// O tim kiem phai khop tien to / mot phan tu: "lap" ra laptop (qua ten danh
// muc Laptops), "xiao" ra Xiaomi 14. Truoc day ca hai tra ve rong.

const search = async q => {
  const res = await req(`/products/search?query=${encodeURIComponent(q)}&limit=50`)
  assert.equal(res.status, 200)
  return res.json.products ?? []
}

test('"lap" tim thay laptop', async () => {
  const products = await search('lap')
  assert.ok(products.length > 0, 'khong co ket qua')
  assert.ok(
    products.some(p => /asus rog/i.test(p.name)),
    `khong thay ASUS ROG: ${products.map(p => p.name).join(', ')}`
  )
})

test('"xiao" tim thay Xiaomi 14', async () => {
  const products = await search('xiao')
  assert.ok(products.some(p => /xiaomi 14/i.test(p.name)))
})

test('khong dau / hoa thuong khong anh huong: "XIAO" va "Lap" van ra', async () => {
  assert.ok((await search('XIAO')).length > 0)
  assert.ok((await search('Lap')).length > 0)
})

test('tu vo nghia van tra ve rong', async () => {
  assert.equal((await search('zzqxw')).length, 0)
})
