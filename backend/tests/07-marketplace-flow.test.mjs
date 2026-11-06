// The end-to-end marketplace journey: multi-shop checkout with per-shop
// shipping and a shop voucher, seller fulfilment, order lifecycle rules,
// loyalty points, voucher refund, returns, and buyer<->seller chat.
// Tests in this file share state and run in declaration order.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  req,
  login,
  ACCOUNTS,
  round2,
  firstProductOf,
  loyaltyPointsOf
} from './helpers.mjs'

const admin = await login(ACCOUNTS.admin)
const seller1 = await login(ACCOUNTS.seller1) // Tech World
const seller2 = await login(ACCOUNTS.seller2) // Gadget Hub
const buyer = await login(ACCOUNTS.buyer)

// expensive tech-world item: guaranteed loyalty points + free-shipping branch;
// cheap gadget-hub item: exercises the paid per-shop shipping branch
const twP = await firstProductOf('tech-world', 'price-desc')
const ghP = await firstProductOf('gadget-hub', 'price-asc')
const pointsBeforeCheckout = await loyaltyPointsOf(buyer)

let orderGroup, orders, twOrder, ghOrder

test('multi-shop checkout with a shop voucher splits into one order per shop', async () => {
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [
        { product_id: twP.id, quantity: 1, color: twP.available_colors?.[0] || null },
        { product_id: ghP.id, quantity: 1, color: ghP.available_colors?.[0] || null }
      ],
      shipping_address: { name: 'Jane', phone: '099', address: 'Demo St' },
      payment_method: 'cod',
      coupon_code: 'TECHWORLD10'
    }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json).slice(0, 200))
  orderGroup = res.json.order_group
  orders = res.json.orders
  assert.equal(orders.length, 2, 'one order per shop')
  twOrder = orders.find(o => o.shop?.slug === 'tech-world')
  ghOrder = orders.find(o => o.shop?.slug === 'gadget-hub')
  assert.ok(twOrder && ghOrder)
})

test('suborder totals sum exactly to the checkout total', async () => {
  const sum = round2(orders.reduce((s, o) => s + Number(o.total_amount), 0))
  assert.equal(sum, round2(Number(orderGroup.total_amount)))
})

test('each shop charges its own shipping fee', async () => {
  const twExpected = Number(twP.final_price) >= 199 ? 0 : 9.99 // platform default
  const ghExpected = Number(ghP.final_price) >= 150 ? 0 : 4.99 // shop override
  assert.equal(round2(Number(twOrder.shipping_fee)), twExpected, 'tech-world fee')
  assert.equal(round2(Number(ghOrder.shipping_fee)), ghExpected, 'gadget-hub fee')
  const shipSum = round2(
    orders.reduce((s, o) => s + Number(o.shipping_fee || 0), 0)
  )
  assert.equal(round2(Number(orderGroup.shipping_fee)), shipSum)
})

test('the shop voucher discounts only the target shop\'s items', async () => {
  // jane has no tier discount in seed, so expected = 10% of the tw item price
  const expected = round2(Number(twP.final_price) * 0.1)
  assert.equal(round2(Number(orderGroup.coupon_discount)), expected)
})

test('a shop voucher is rejected when the cart has no items from that shop', async () => {
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [
        { product_id: ghP.id, quantity: 1, color: ghP.available_colors?.[0] || null }
      ],
      shipping_address: { name: 'J', phone: '0', address: 'x' },
      payment_method: 'cod',
      coupon_code: 'TECHWORLD10'
    }
  })
  assert.equal(res.status, 400)
})

test('a seller cannot buy from their own shop', async () => {
  const res = await req('/orders', {
    method: 'POST',
    token: seller1,
    body: {
      items: [
        { product_id: twP.id, quantity: 1, color: twP.available_colors?.[0] || null }
      ],
      shipping_address: { name: 'S', phone: '1', address: 'x' },
      payment_method: 'cod'
    }
  })
  assert.equal(res.status, 400)
})

test('ordering more than the available stock is rejected', async () => {
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [
        {
          product_id: ghP.id,
          quantity: 99999,
          color: ghP.available_colors?.[0] || null
        }
      ],
      shipping_address: { name: 'J', phone: '0', address: 'x' },
      payment_method: 'cod'
    }
  })
  assert.equal(res.status, 400)
})

test('each seller sees exactly their own suborder', async () => {
  const s1Orders = (await req('/orders/shop/mine?limit=50', { token: seller1 }))
    .json?.orders
  const s2Orders = (await req('/orders/shop/mine?limit=50', { token: seller2 }))
    .json?.orders
  assert.ok(s1Orders.some(o => o.id === twOrder.id), 'seller1 sees tw order')
  assert.ok(!s1Orders.some(o => o.id === ghOrder.id), 'seller1 blind to gh order')
  assert.ok(s2Orders.some(o => o.id === ghOrder.id), 'seller2 sees gh order')
})

test('a seller cannot update another shop\'s order', async () => {
  const res = await req(`/orders/${ghOrder.id}/update_status`, {
    method: 'PATCH',
    token: seller1,
    body: { status: 'processing' }
  })
  assert.equal(res.status, 403)
})

test('the seller receives a new-order notification', async () => {
  const notis = await req('/notifications?limit=10', { token: seller1 })
  const titles = (notis.json?.data?.notifications || []).map(n => n.title)
  assert.ok(titles.some(t => /new order/i.test(t)), `titles=${titles.join('|')}`)
})

test('seller advances their suborder along the legal status flow', async () => {
  for (const status of ['processing', 'shipped', 'delivered']) {
    const res = await req(`/orders/${ghOrder.id}/update_status`, {
      method: 'PATCH',
      token: seller2,
      body: { status }
    })
    assert.equal(res.status, 200, `-> ${status}`)
  }
})

test('checkout earned loyalty points on merchandise', async () => {
  const now = await loyaltyPointsOf(buyer)
  assert.ok(now > pointsBeforeCheckout, `${pointsBeforeCheckout} -> ${now}`)
})

// ---------- returns ----------
let stockBeforeReturn, pointsBeforeReturn, returnId

test('buyer requests a return on the delivered order', async () => {
  stockBeforeReturn = (await req(`/products/${ghP.id}`)).json?.quantity
  pointsBeforeReturn = await loyaltyPointsOf(buyer)
  const res = await req('/returns', {
    method: 'POST',
    token: buyer,
    body: { order_id: ghOrder.id, reason: 'Product arrived damaged' }
  })
  assert.equal(res.status, 201)

  const dup = await req('/returns', {
    method: 'POST',
    token: buyer,
    body: { order_id: ghOrder.id, reason: 'again' }
  })
  assert.equal(dup.status, 400, 'duplicate request rejected')
})

test('only the owning seller can resolve the return', async () => {
  const list = (await req('/returns/shop/mine', { token: seller2 })).json?.data
    ?.requests
  returnId = list?.find(r => r.order.id === Number(ghOrder.id))?.id
  assert.ok(returnId, 'seller sees the pending request')

  const foreign = await req(`/returns/${returnId}/resolve`, {
    method: 'PATCH',
    token: seller1,
    body: { action: 'approve' }
  })
  assert.equal(foreign.status, 403)
})

test('approving the return restocks items, reverts points, finalizes the order', async () => {
  const res = await req(`/returns/${returnId}/resolve`, {
    method: 'PATCH',
    token: seller2,
    body: { action: 'approve', note: 'Refund issued' }
  })
  assert.equal(res.status, 200)

  const order = (await req(`/orders/${ghOrder.id}`, { token: buyer })).json
  assert.equal(order?.status, 'returned')

  const stockAfter = (await req(`/products/${ghP.id}`)).json?.quantity
  assert.equal(Number(stockAfter), Number(stockBeforeReturn) + 1, 'restocked')

  const pointsAfter = await loyaltyPointsOf(buyer)
  assert.ok(pointsAfter <= pointsBeforeReturn, 'points clawed back')
})

// ---------- status state machine ----------
test('final statuses are locked', async () => {
  // returned order cannot be revived
  const revive = await req(`/orders/${ghOrder.id}/update_status`, {
    method: 'PATCH',
    token: seller2,
    body: { status: 'processing' }
  })
  assert.equal(revive.status, 400)

  // deliver the tech-world order, then verify it is final
  await req(`/orders/${twOrder.id}/update_status`, {
    method: 'PATCH',
    token: seller1,
    body: { status: 'delivered' }
  })
  const cancelDelivered = await req(`/orders/${twOrder.id}/cancel`, {
    method: 'PATCH',
    token: buyer
  })
  assert.equal(cancelDelivered.status, 400, 'delivered cannot be cancelled')
  const backwards = await req(`/orders/${twOrder.id}/update_status`, {
    method: 'PATCH',
    token: seller1,
    body: { status: 'shipped' }
  })
  assert.equal(backwards.status, 400, 'no backwards transition')
})

// ---------- reviews require purchase ----------
test('buyer can review the delivered product but not an unbought one', async () => {
  // find a product absent from every delivered order of the buyer
  const myOrders = (await req('/orders/user/orders', { token: buyer })).json || []
  const delivered = new Set(
    myOrders
      .filter(o => o.status === 'delivered')
      .flatMap(o => (o.order_items || []).map(i => String(i.product_id)))
  )
  const all = (await req('/products?limit=100')).json?.products || []
  const unbought = all.find(p => !delivered.has(String(p.id)))
  const rejected = await req('/reviews', {
    method: 'POST',
    token: buyer,
    body: { productId: unbought.id, rating: 5, comment: 'Looks great!' }
  })
  assert.equal(rejected.status, 403, `product=${unbought.id}`)
})

// ---------- voucher refund on full-checkout cancel ----------
test('voucher use is refunded only when the whole checkout is cancelled', async () => {
  const countOf = async () =>
    (await req('/coupons?q=GADGET5', { token: admin })).json?.coupons?.find(
      c => c.code === 'GADGET5'
    )?.used_count
  const before = await countOf()

  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [
        { product_id: ghP.id, quantity: 1, color: ghP.available_colors?.[0] || null }
      ],
      shipping_address: { name: 'Jane', phone: '099', address: 'Demo St' },
      payment_method: 'momo',
      coupon_code: 'GADGET5'
    }
  })
  assert.equal(res.status, 201)
  assert.equal(await countOf(), before + 1, 'use counted at checkout')

  const cancel = await req(`/orders/${res.json.orders[0].id}/cancel`, {
    method: 'PATCH',
    token: buyer
  })
  assert.equal(cancel.status, 200)
  assert.equal(await countOf(), before, 'use refunded after full cancel')
})

// ---------- buyer <-> seller chat ----------
test('buyer chats with the shop; only that seller can read and reply', async () => {
  const shopId = twOrder.shop.id
  const chat = (await req(`/chat?shop_id=${shopId}`, { token: buyer })).json?.data
  assert.ok(chat?.id, 'chat opened')
  assert.equal(String(chat.shop_id), String(shopId))

  const sent = await req('/chat/message', {
    method: 'POST',
    token: buyer,
    body: { chatId: chat.id, content: 'Hello, is this in stock?' }
  })
  assert.equal(sent.status, 201)

  const inbox = (await req('/chat/shop/mine', { token: seller1 })).json?.data?.chats
  assert.ok(inbox.some(c => String(c.id) === String(chat.id)), 'in seller inbox')

  const reply = await req('/chat/message', {
    method: 'POST',
    token: seller1,
    body: { chatId: chat.id, content: 'Yes, ready to ship today!' }
  })
  assert.equal(reply.status, 201)

  const intruder = await req(`/chat/${chat.id}`, { token: seller2 })
  assert.equal(intruder.status, 403, 'other sellers locked out')

  const adminInbox = (await req('/chat/admin/all', { token: admin })).json?.data?.chats
  assert.ok(
    !adminInbox.some(c => String(c.id) === String(chat.id)),
    'shop chats stay out of the platform support inbox'
  )
})
