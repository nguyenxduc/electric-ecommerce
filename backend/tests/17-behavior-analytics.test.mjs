// GET /api/dashboard/behavior - retention + phieu chuyen doi.
//
// "npm run seed" KHONG xoa user_behavior_daily: clearDatabase() trong
// seed/index.js chi deleteMany() cac bang nghiep vu (order, product, user...),
// khong he cham vao user_behavior_daily lan user_behavior. Vi vay bang nay co
// the dang chua du lieu rollup that cua may dev, va cac bai duoi day phai tu
// don sach cua so thu nghiem roi TRA LAI nguyen trang trong finally.
//
// Cua so bao cao cua endpoint luon ket thuc o het ngay HOM QUA (rollup chi co
// den do), nen moi dong thu nghiem o day deu duoc ghi vao ngay hom qua / hom
// truoc, khong phai hom nay.
import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../lib/db.js'
import { req, login, ACCOUNTS } from './helpers.mjs'

const admin = await login(ACCOUNTS.admin)

const utcMidnight = daysAgo => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

const YESTERDAY = utcMidnight(1)
const DAY_BEFORE = utcMidnight(2)

const behavior = async days =>
  req(`/dashboard/behavior?days=${days}`, { token: admin })

// Don sach cua so [from, ...] roi chay fn, sau do tra lai dung cac dong cu.
const withCleanWindow = async (from, fn) => {
  const where = { day: { gte: from } }
  const saved = await prisma.userBehaviorDaily.findMany({ where })
  await prisma.userBehaviorDaily.deleteMany({ where })
  try {
    await fn()
  } finally {
    await prisma.userBehaviorDaily.deleteMany({ where })
    if (saved.length > 0) {
      // Bo id/updated_at: giu id cu se de sequence tut lai sau lung du lieu.
      await prisma.userBehaviorDaily.createMany({
        data: saved.map(({ id, updated_at, ...row }) => row)
      })
    }
  }
}

test('returningRate: 10 khach, 4 khach xuat hien tu 2 ngay tro len -> 40', async () => {
  await withCleanWindow(DAY_BEFORE, async () => {
    const rows = []
    for (let i = 0; i < 10; i++) {
      rows.push({
        visitor_key: `sess:t17-ret-${i}`,
        product_id: 0n,
        event_type: 'view',
        day: YESTERDAY,
        event_count: 1
      })
    }
    // 4 trong so 10 khach do quay lai mot ngay khac -> dung 4 khach returning.
    for (let i = 0; i < 4; i++) {
      rows.push({
        visitor_key: `sess:t17-ret-${i}`,
        product_id: 0n,
        event_type: 'view',
        day: DAY_BEFORE,
        event_count: 1
      })
    }
    await prisma.userBehaviorDaily.createMany({ data: rows })

    const res = await behavior(2)
    assert.equal(res.status, 200, JSON.stringify(res.json).slice(0, 200))
    const data = res.json.data
    assert.equal(data.visitors, 10, 'visitors dem theo visitor_key duy nhat')
    assert.equal(data.returning, 4)
    assert.equal(data.returningRate, 40)
  })
})

test('viewToCartRate: giao cua hai tap, khong phai hai so dem roi rac -> 30', async () => {
  await withCleanWindow(DAY_BEFORE, async () => {
    const rows = []
    for (let i = 0; i < 10; i++) {
      rows.push({
        visitor_key: `sess:t17-fun-${i}`,
        product_id: 0n,
        event_type: 'view',
        day: YESTERDAY,
        event_count: 1
      })
    }
    // 3 khach da xem roi them vao gio -> tu so dung = 3.
    for (let i = 0; i < 3; i++) {
      rows.push({
        visitor_key: `sess:t17-fun-${i}`,
        product_id: 0n,
        event_type: 'add_to_cart',
        day: YESTERDAY,
        event_count: 1
      })
    }
    // 2 khach them vao gio nhung KHONG he co dong 'view' -> phai bi loai.
    // Neu dem roi rac se ra 5/10 = 50 thay vi 3/10 = 30.
    for (let i = 0; i < 2; i++) {
      rows.push({
        visitor_key: `sess:t17-nocart-view-${i}`,
        product_id: 0n,
        event_type: 'add_to_cart',
        day: YESTERDAY,
        event_count: 1
      })
    }
    await prisma.userBehaviorDaily.createMany({ data: rows })

    const res = await behavior(2)
    assert.equal(res.status, 200, JSON.stringify(res.json).slice(0, 200))
    const { funnel } = res.json.data
    assert.equal(funnel.viewers, 10)
    assert.equal(funnel.carters, 3, 'chi tinh khach da tung xem')
    assert.equal(funnel.viewToCartRate, 30)
  })
})

test('cua so rong: moi ty le la 0 chan, khong co NaN trong response', async () => {
  // days=0 -> since = hom nay 00:00 UTC, con moc cuoi la het hom qua: cua so
  // rong hoan toan, moi mau so bang 0.
  const res = await behavior(0)
  assert.equal(res.status, 200, JSON.stringify(res.json).slice(0, 200))
  const data = res.json.data
  assert.equal(data.visitors, 0)
  assert.equal(data.returningRate, 0)
  assert.equal(data.funnel.viewToCartRate, 0)
  assert.equal(data.funnel.cartToOrderRate, 0)
  assert.ok(!JSON.stringify(res.json).includes('NaN'), 'khong duoc lot NaN ra response')
})

test('behavior analytics chi danh cho admin', async () => {
  const buyer = await login(ACCOUNTS.buyer)
  const seller = await login(ACCOUNTS.seller1)

  assert.equal((await req('/dashboard/behavior', { token: buyer })).status, 403)
  assert.equal((await req('/dashboard/behavior', { token: seller })).status, 403)
  assert.equal((await req('/dashboard/behavior')).status, 401)
})

test('buyers khong tinh don da huy', async () => {
  // helpers.mjs khong co helper dat don, va mot don dat qua HTTP luon mang
  // created_at = hom nay (nam NGOAI cua so bao cao), nen ghi thang 2 dong don
  // da lui ngay ve hom qua - dung kieu cua 16-retrieval-cache.test.mjs.
  const shop = await prisma.shop.findFirst({ where: { deleted_at: null } })
  assert.ok(shop, 'can it nhat mot shop da seed')

  // Cung cua so voi endpoint: [30 ngay truoc 00:00 UTC, het ngay hom qua].
  // Khong duoc de gte-only o day, vi don dat HOM NAY (cac bai test khac tao ra)
  // se lot vao tap nay nhung endpoint thi da cat o moc hom qua.
  const whereRevenue = {
    deleted_at: null,
    status: { notIn: ['cancelled', 'returned'] },
    created_at: {
      gte: utcMidnight(30),
      lte: new Date(YESTERDAY.getTime() + 24 * 60 * 60 * 1000 - 1)
    }
  }
  const counted = new Set(
    (await prisma.order.groupBy({ by: ['user_id'], where: whereRevenue })).map(g =>
      g.user_id.toString()
    )
  )
  // Hai nguoi chua he co don "tinh doanh thu" trong cua so, de delta doc duoc.
  const fresh = (
    await prisma.user.findMany({ where: { deleted_at: null }, take: 50 })
  ).filter(u => !counted.has(u.id.toString()))
  assert.ok(fresh.length >= 2, 'can 2 user chua co don trong cua so 30 ngay')
  const [uOk, uCancelled] = fresh

  const baseline = (await behavior(30)).json.data.funnel.buyers

  const placedAt = new Date(YESTERDAY.getTime() + 12 * 60 * 60 * 1000)
  const stamp = Date.now()
  const groups = []
  const orders = []
  try {
    for (const [idx, u] of [uOk, uCancelled].entries()) {
      const group = await prisma.orderGroup.create({
        data: {
          user_id: u.id,
          group_number: `T17-${stamp}-${idx}`,
          subtotal_amount: 10,
          total_amount: 10,
          created_at: placedAt
        }
      })
      groups.push(group.id)
      const order = await prisma.order.create({
        data: {
          user_id: u.id,
          shop_id: shop.id,
          order_group_id: group.id,
          total_amount: 10,
          status: idx === 0 ? 'delivered' : 'cancelled',
          created_at: placedAt
        }
      })
      orders.push(order.id)
    }

    const res = await behavior(30)
    assert.equal(res.status, 200, JSON.stringify(res.json).slice(0, 200))
    // +1 cho don delivered, +0 cho don cancelled.
    assert.equal(
      res.json.data.funnel.buyers,
      baseline + 1,
      'don da huy khong duoc tinh la nguoi mua'
    )
  } finally {
    await prisma.order.deleteMany({ where: { id: { in: orders } } })
    await prisma.orderGroup.deleteMany({ where: { id: { in: groups } } })
  }
})
