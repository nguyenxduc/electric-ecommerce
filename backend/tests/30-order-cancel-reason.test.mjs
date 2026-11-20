// Nguoi mua huy don kem ly do: ly do luu trong metadata cua audit log ORDER_CANCEL
// (khong doi schema). Khong gui ly do thi van huy duoc nhu cu.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS, firstProductOf } from './helpers.mjs'
import { prisma } from '../lib/db.js'

after(() => prisma.$disconnect())

const buyer = await login(ACCOUNTS.buyer2)
const ghP = await firstProductOf('gadget-hub')

const placeCodOrder = async () => {
  const res = await req('/orders', {
    method: 'POST',
    token: buyer,
    body: {
      items: [{ product_id: ghP.id, quantity: 1, color: ghP.available_colors?.[0] || null }],
      shipping_address: { name: 'John', phone: '0912345678', address: 'Demo St' },
      payment_method: 'cod'
    }
  })
  assert.equal(res.status, 201, JSON.stringify(res.json).slice(0, 200))
  return res.json.orders[0].id
}

// writeAuditLog chay nen (khong await) nen doi toi da ~2s
const findCancelLog = async id => {
  for (let i = 0; i < 20; i++) {
    const log = await prisma.auditLog.findFirst({
      where: { action: 'ORDER_CANCEL', resource: 'order', resource_id: BigInt(id) }
    })
    if (log) return log
    await new Promise(r => setTimeout(r, 100))
  }
  return null
}

test('buyer cancel stores the reason in the audit log', async () => {
  const id = await placeCodOrder()
  const res = await req(`/orders/${id}/cancel`, {
    method: 'PATCH',
    token: buyer,
    body: { reason: '  Found a better price  ' }
  })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  assert.equal(res.json.order.status, 'cancelled')
  const log = await findCancelLog(id)
  assert.ok(log, 'audit log written')
  assert.equal(log.metadata.reason, 'Found a better price')
})

test('cancel without a reason still works; non-string reason is ignored', async () => {
  const id = await placeCodOrder()
  const res = await req(`/orders/${id}/cancel`, {
    method: 'PATCH',
    token: buyer,
    body: { reason: { not: '' } }
  })
  assert.equal(res.status, 200, JSON.stringify(res.json))
  const log = await findCancelLog(id)
  assert.ok(log)
  assert.equal(log.metadata.reason, undefined)
})
