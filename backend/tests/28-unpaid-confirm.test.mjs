// Seller khong duoc day don online chua tra tien ra khoi "pending": job huy don
// qua han chi quet pending, nen don se ket mai o "processing" ma khong ai tra tien.
// Don MoMo chi rời pending khi callback bao da tra (hoac bi huy).
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'

after(() => prisma.$disconnect())

const buyer = await login(ACCOUNTS.buyer2)
const seller2 = await login(ACCOUNTS.seller2) // Gadget Hub
const ghP = await firstProductOf('gadget-hub')

const placeOrder = async payment_method => {
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [{ product_id: ghP.id, quantity: 1, color: ghP.available_colors?.[0] || null }],
      shipping_address: { name: 'John', phone: '0912345678', address: 'Demo St' },
      payment_method
    }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json).slice(0, 200))
  return res.json.orders[0].id
}

test('seller cannot confirm an unpaid MoMo order', async () => {
  const id = await placeOrder('momo')
  const res = await req(`/orders/${id}/update_status`, {
    method: 'PATCH',
    token: seller2,
    body: { status: 'processing' }
  })
  assert.equal(res.status, 400)
  assert.match(res.json.message, /not been paid/)
  const order = await prisma.order.findUnique({ where: { id: BigInt(id) } })
  assert.equal(order.status, 'pending', 'order stays visible to the expiry job')

  // Huy van duoc phep
  const cancel = await req(`/orders/${id}/update_status`, {
    method: 'PATCH',
    token: seller2,
    body: { status: 'cancelled' }
  })
  assert.equal(cancel.status, 200)
})

test('seller can still confirm a COD order', async () => {
  const id = await placeOrder('cod')
  const res = await req(`/orders/${id}/update_status`, {
    method: 'PATCH',
    token: seller2,
    body: { status: 'processing' }
  })
  assert.equal(res.status, 200, JSON.stringify(res.json))
})
