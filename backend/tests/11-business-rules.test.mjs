import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, round2 } from './helpers.mjs'

// Bon quy tac nghiep vu duoc phat hien sai trong dot kiem toan logic.
// Moi test o day tung THAT BAI truoc khi vá.

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1)

// Lay mot san pham kem mau (san pham trong seed deu co bien the mau).
// Uu tien san pham con nhieu hang: cac test trong file nay dat kha nhieu don
// nen neu luon chon cung mot mon re nhat thi test sau se het ton kho.
const orderableProduct = async (slug = 'tech-world', minStock = 1) => {
  const list = await req(`/shops/${slug}/products?limit=20`)
  const all = list.json?.products ?? []
  const p = [...all]
    .filter(x => !(x.variants?.length))
    .sort((x, y) => (y.quantity ?? 0) - (x.quantity ?? 0))
    .find(x => (x.quantity ?? 0) >= minStock)
  assert.ok(p, `shop ${slug} khong co san pham con >= ${minStock} hang`)
  const detail = await req(`/products/${p.id}`)
  const colors = (detail.json?.data ?? detail.json)?.available_colors ?? []
  return {
    product_id: p.id,
    quantity: 1,
    ...(colors.length && { color: { name: colors[0].name, code: colors[0].code } })
  }
}

const placeOrder = (token, items, couponCode) =>
  req('/orders', {
    method: 'POST',
    token,
    body: {
      items,
      shipping_address: { name: 'Rule Test', phone: '0900000000', address: 'HN' },
      payment_method: 'cod',
      ...(couponCode && { coupon_code: couponCode })
    }
  })

test('voucher gioi han 1 luot khong bi dung vuot khi thanh toan dong thoi', async () => {
  const code = `RACE${Date.now()}`
  const created = await req('/coupons', {
    method: 'POST',
    token: admin,
    body: {
      code,
      discount_type: 'fixed',
      discount_value: 5,
      min_order: 0,
      usage_limit: 1
    }
  })
  assert.ok([200, 201].includes(created.status), 'khong tao duoc voucher thu nghiem')

  const item = await orderableProduct()
  const buyers = await Promise.all([
    login(ACCOUNTS.buyer),
    login(ACCOUNTS.buyer2),
    login(ACCOUNTS.applicant)
  ])

  // Ban cung luc: kiem tra usage_limit chay truoc transaction nen neu khong co
  // cap nhat co dieu kien thi ca ba deu di lot.
  const results = await Promise.all(buyers.map(t => placeOrder(t, [item], code)))
  const ok = results.filter(r => [200, 201].includes(r.status)).length

  assert.equal(ok, 1, `${ok}/3 don dung duoc voucher gioi han 1 luot`)
})

test('bang chi tiet tien cong lai dung bang tong thanh toan', async () => {
  // Voucher phan tram tren so le tung lam lech 1 xu: giam gia duoc lam tron khi
  // LUU nhung tong lai tinh tu gia tri CHUA lam tron (vd 6099.95 x 10% =
  // 609.995 -> luu 610.00 nhung total tinh tu 609.995).
  //
  // Nua xu chi xuat hien voi mot so to hop gia/so luong nhat dinh. Gia trong
  // seed deu tan cung .99, nen so luong 5 cho subtotal tan cung .95 va voucher
  // 10% sinh dung nua xu - do la ca tai hien duoc loi nay.
  const tw = await orderableProduct('tech-world')
  const gh = await orderableProduct('gadget-hub')
  const buyer = await login(ACCOUNTS.buyer2)

  // Gio mot shop moi giu duoc duoi .95; gio hai shop cong lai thanh .90 nen
  // phai thu ca hai hinh thai.
  const carts = [
    ['mot shop', q => [{ ...tw, quantity: q }]],
    ['hai shop', q => [{ ...tw, quantity: q }, { ...gh, quantity: q }]]
  ]

  let checked = 0
  for (const [shape, build] of carts)
  for (const qty of [1, 2, 5]) {
    for (const code of [null, 'WELCOME10', 'TECHWORLD10']) {
      const items = build(qty)
      const res = await placeOrder(buyer, items, code)
      if (![200, 201].includes(res.status)) continue // voucher/ton kho khong dat

      const data = res.json?.data ?? res.json
      const g = data.orderGroup ?? data.order_group
      const orders = data.orders ?? []
      checked++

      const total = round2(g.total_amount)
      const rebuilt = round2(
        Number(g.subtotal_amount) -
          Number(g.tier_discount) -
          Number(g.coupon_discount) +
          Number(g.shipping_fee)
      )
      assert.equal(
        rebuilt,
        total,
        `${shape} qty=${qty} voucher=${code}: subtotal-giamgia+ship = ${rebuilt} nhung total = ${total}`
      )

      const sum = round2(orders.reduce((s, o) => s + Number(o.total_amount), 0))
      assert.equal(
        sum,
        total,
        `${shape} qty=${qty} voucher=${code}: tong don con ${sum} != tong ${total}`
      )
    }
  }
  assert.ok(checked > 0, 'khong kiem duoc gio hang nao')
})

test('moi trang thai don trong du lieu deu chuyen tiep duoc', async () => {
  // Seed tung sinh trang thai "confirmed" - khong co trong may trang thai nen
  // don do ket vinh vien: khong chuyen tiep duoc ma cung khong huy duoc.
  const KNOWN = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned'
  ]
  const res = await req('/orders?limit=200', { token: admin })
  const orders = res.json?.data?.orders ?? res.json?.orders ?? res.json?.data ?? []
  assert.ok(Array.isArray(orders) && orders.length > 0, 'khong doc duoc danh sach don')

  const unknown = [
    ...new Set(orders.map(o => o.status).filter(s => s && !KNOWN.includes(s)))
  ]
  assert.deepEqual(
    unknown,
    [],
    `co trang thai khong nam trong may trang thai: ${unknown.join(', ')}`
  )
})

test('don da huy khong con duoc tinh vao doanh thu va phi san', async () => {
  const buyer = await login(ACCOUNTS.buyer2)
  const readRevenue = async () => {
    const d = await req('/dashboard/shop/stats', { token: seller1 })
    assert.equal(d.status, 200)
    return {
      total: Number(d.json?.data?.revenue?.total ?? 0),
      fee: Number(d.json?.data?.commission?.fee ?? 0)
    }
  }

  const before = await readRevenue()
  const item = await orderableProduct('tech-world', 5)
  const made = await placeOrder(buyer, [item])
  assert.ok([200, 201].includes(made.status), 'khong dat duoc don thu nghiem')

  const order = (made.json?.data ?? made.json)?.orders?.[0]
  assert.ok(order, 'khong lay duoc don con')

  const during = await readRevenue()
  assert.ok(
    during.total > before.total,
    'don moi khong lam tang doanh thu - so lieu dashboard co van de'
  )

  const cancelled = await req(`/orders/${order.id}/cancel`, {
    method: 'PATCH',
    token: buyer
  })
  assert.equal(cancelled.status, 200, 'khong huy duoc don')

  const after = await readRevenue()
  assert.equal(
    round2(after.total),
    round2(before.total),
    'doanh thu van tinh ca don da huy'
  )
  assert.equal(round2(after.fee), round2(before.fee), 'phi san van tinh ca don da huy')
})
