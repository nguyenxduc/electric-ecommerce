import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS, noVariants } from './helpers.mjs'

// Huy don (hoan kho) chay song song voi checkout (tru kho).
//
// Ca hai deu UPDATE dong san pham/bien the/mau va giu khoa toi cuoi giao dich.
// Checkout khoa theo thu tu co dinh (product_id, roi bien the -> mau -> san
// pham). Neu hoan kho khoa theo thu tu khac - thu tu mon trong don, hoac mau
// truoc bien the - thi hai ben cho vong tron, Postgres huy mot ben (40P01).
// Kho van dung nho rollback, nhung nguoi bam Huy nhan 500.
//
// Mong doi: moi lan huy 200, moi checkout 201, ton kho cuoi cung dung bang
// so ban dau tru so don checkout moi.

const buyers = await Promise.all([
  login(ACCOUNTS.buyer),
  login(ACCOUNTS.buyer2),
  login(ACCOUNTS.applicant)
])

const LEAK = /prisma|deadlock|ConnectorError|Process \d+/i

const placeOrder = (token, items) =>
  req('/orders', {
    method: 'POST',
    token,
    body: {
      items,
      shipping_address: { name: 'Restock Race', phone: '0900000000', address: 'HN' },
      payment_method: 'cod'
    }
  })

const cancelOrder = (token, orderId) =>
  req(`/orders/${orderId}/cancel`, { method: 'PATCH', token })

/** Dat ton kho san pham, moi mau, moi bien the ve qty; tra ham khoi phuc. */
const fillStock = async (productId, qty) => {
  const id = BigInt(productId)
  const before = await prisma.product.findUnique({
    where: { id },
    select: {
      quantity: true,
      product_colors: { select: { id: true, quantity: true } },
      variants: { select: { id: true, quantity: true } }
    }
  })
  await prisma.product.update({ where: { id }, data: { quantity: qty } })
  for (const c of before.product_colors) {
    await prisma.productColor.update({ where: { id: c.id }, data: { quantity: qty } })
  }
  for (const v of before.variants) {
    await prisma.productVariant.update({ where: { id: v.id }, data: { quantity: qty } })
  }
  return async () => {
    await prisma.product.update({ where: { id }, data: { quantity: before.quantity } })
    for (const c of before.product_colors) {
      await prisma.productColor.update({ where: { id: c.id }, data: { quantity: c.quantity } })
    }
    for (const v of before.variants) {
      await prisma.productVariant.update({ where: { id: v.id }, data: { quantity: v.quantity } })
    }
  }
}

const colorOf = async productId => {
  const detail = await req(`/products/${productId}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  return colors.length ? { color: { name: colors[0].name, code: colors[0].code } } : {}
}

/**
 * Tao K don voi `orderLines`, roi chay DONG THOI: huy ca K don + M checkout
 * moi voi `checkoutLines`. Tra ve ket qua de assert.
 */
const raceCancelVsCheckout = async ({ orderLines, checkoutLines, K = 4, M = 4 }) => {
  const placed = []
  for (let i = 0; i < K; i++) {
    const t = buyers[i % buyers.length]
    const r = await placeOrder(t, orderLines)
    assert.equal(r.status, 201, JSON.stringify(r.json))
    placed.push({ token: t, orderId: r.json.orders[0].id })
  }
  const cancels = placed.map(p => cancelOrder(p.token, p.orderId))
  const checkouts = Array.from({ length: M }, (_, i) =>
    placeOrder(buyers[i % buyers.length], checkoutLines)
  )
  const [cancelRes, checkoutRes] = await Promise.all([
    Promise.all(cancels),
    Promise.all(checkouts)
  ])
  return { cancelRes, checkoutRes }
}

const assertNoFailures = ({ cancelRes, checkoutRes }) => {
  const all = [...cancelRes, ...checkoutRes]
  for (const r of all.filter(r => r.status >= 400)) {
    const body = JSON.stringify(r.json ?? {})
    assert.doesNotMatch(body, LEAK, `lo chi tiet noi bo: ${body.slice(0, 200)}`)
  }
  assert.deepEqual(
    cancelRes.map(r => r.status).filter(s => s !== 200),
    [],
    `huy don that bai: ${JSON.stringify(cancelRes.map(r => [r.status, r.json?.message ?? r.json?.error]))}`
  )
  assert.deepEqual(
    checkoutRes.map(r => r.status).filter(s => s !== 201),
    [],
    `checkout that bai: ${JSON.stringify(checkoutRes.map(r => [r.status, r.json?.message ?? r.json?.code]))}`
  )
}

test('huy don [Y, X] song song voi checkout [X, Y]: khong 500, ton kho cuoi dung', async () => {
  const list = (await req('/shops/tech-world/products?limit=20')).json?.products ?? []
  const simple = list.filter(noVariants).sort((a, b) => Number(a.id) - Number(b.id))
  assert.ok(simple.length >= 2, 'can 2 san pham khong bien the cung shop')
  const x = simple[0] // id nho hon: checkout khoa X truoc
  const y = simple[simple.length - 1] // id lon hon: don cu liet ke Y truoc
  const restoreX = await fillStock(x.id, 500)
  const restoreY = await fillStock(y.id, 500)
  try {
    const lx = { product_id: x.id, quantity: 1, ...(await colorOf(x.id)) }
    const ly = { product_id: y.id, quantity: 1, ...(await colorOf(y.id)) }
    const K = 4
    const M = 4
    const result = await raceCancelVsCheckout({
      orderLines: [ly, lx],
      checkoutLines: [lx, ly],
      K,
      M
    })
    assertNoFailures(result)
    for (const p of [x, y]) {
      const after = await prisma.product.findUnique({ where: { id: BigInt(p.id) }, select: { quantity: true } })
      assert.equal(after.quantity, 500 - M, `ton kho ${p.name} lech`)
    }
  } finally {
    await restoreX()
    await restoreY()
  }
})

test('huy don co bien the + mau song song voi checkout cung bien the + mau: khong 500', async () => {
  const p = await prisma.product.findFirst({
    where: { deleted_at: null, variants: { some: { deleted_at: null } }, product_colors: { some: {} } },
    select: { id: true, name: true, variants: { where: { deleted_at: null }, select: { id: true }, take: 1 } }
  })
  if (!p) return // seed khong co san pham vua co bien the vua co mau
  const restore = await fillStock(p.id, 500)
  try {
    const line = {
      product_id: p.id.toString(),
      variant_id: p.variants[0].id.toString(),
      quantity: 1,
      ...(await colorOf(p.id))
    }
    const M = 4
    const result = await raceCancelVsCheckout({ orderLines: [line], checkoutLines: [line], K: 4, M })
    assertNoFailures(result)
    const after = await prisma.productVariant.findUnique({
      where: { id: p.variants[0].id },
      select: { quantity: true }
    })
    assert.equal(after.quantity, 500 - M, 'ton kho bien the lech')
  } finally {
    await restore()
  }
})
