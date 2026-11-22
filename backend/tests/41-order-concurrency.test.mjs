import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, noVariants } from './helpers.mjs'

// Dat hang dong thoi voi gio hang chua CUNG hai san pham nhung THU TU NGUOC NHAU.
//
// Tru kho la UPDATE co dieu kien, Postgres khoa dong san pham toi cuoi giao
// dich. Neu giao dich A khoa X roi cho Y, giao dich B khoa Y roi cho X thi
// Postgres phat hien deadlock va huy mot ben. Kho van dung, nhung nguoi mua
// bi huy tung nhan 500 kem thong bao loi goc cua Prisma - trong khi hang con
// du. Kho du cho moi don o day, nen mong doi la tat ca deu thanh cong, va
// neu co don loi thi body khong duoc lo thong bao goc cua Prisma.

const buyers = await Promise.all([
  login(ACCOUNTS.buyer),
  login(ACCOUNTS.buyer2),
  login(ACCOUNTS.applicant)
])

const pickProduct = async slug => {
  const res = await req(`/shops/${slug}/products?limit=20`)
  const p = (res.json?.products ?? []).find(noVariants)
  assert.ok(p, `shop ${slug} khong co san pham khong bien the`)
  return p
}

/** Dat ton kho san pham va moi mau ve qty, tra ham khoi phuc. */
const fillStock = async (productId, qty) => {
  const before = await prisma.product.findUnique({
    where: { id: BigInt(productId) },
    select: { quantity: true, product_colors: { select: { id: true, quantity: true } } }
  })
  await prisma.product.update({ where: { id: BigInt(productId) }, data: { quantity: qty } })
  for (const c of before.product_colors) {
    await prisma.productColor.update({ where: { id: c.id }, data: { quantity: qty } })
  }
  return async () => {
    await prisma.product.update({
      where: { id: BigInt(productId) },
      data: { quantity: before.quantity }
    })
    for (const c of before.product_colors) {
      await prisma.productColor.update({ where: { id: c.id }, data: { quantity: c.quantity } })
    }
  }
}

const lineOf = async p => {
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  return {
    product_id: p.id,
    quantity: 1,
    ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } })
  }
}

const placeOrder = (token, items) =>
  req('/orders', {
    method: 'POST',
    token,
    body: {
      items,
      shipping_address: { name: 'Deadlock Test', phone: '0900000000', address: 'HN' },
      payment_method: 'cod'
    }
  })

test('gio hang {X, Y} va {Y, X} dat dong thoi: khong don nao nhan 500, du hang thi deu thanh cong', async () => {
  const x = await pickProduct('tech-world')
  const y = await pickProduct('gadget-hub')
  const restoreX = await fillStock(x.id, 500)
  const restoreY = await fillStock(y.id, 500)
  try {
    const lx = await lineOf(x)
    const ly = await lineOf(y)

    // Nhieu cap chay cung luc de deadlock gan nhu chac chan xay ra o code cu.
    const ROUNDS = 6
    const calls = []
    for (let i = 0; i < ROUNDS; i++) {
      const t = buyers[i % buyers.length]
      calls.push(placeOrder(t, i % 2 ? [ly, lx] : [lx, ly]))
    }
    const results = await Promise.all(calls)

    const failed = results.filter(r => r.status !== 201)
    // Don nao loi thi body cung khong duoc mang thong bao goc cua Prisma/Postgres.
    for (const r of failed) {
      const body = JSON.stringify(r.json ?? {})
      assert.doesNotMatch(body, /prisma|deadlock|ConnectorError|Process \d+/i, `lo chi tiet noi bo: ${body.slice(0, 200)}`)
    }
    assert.deepEqual(
      failed.map(r => [r.status, r.json?.code ?? r.json?.message]),
      [],
      'du hang ma van co don that bai'
    )
  } finally {
    await restoreX()
    await restoreY()
  }
})
