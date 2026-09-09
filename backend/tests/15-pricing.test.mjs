import test from 'node:test'
import assert from 'node:assert/strict'
import {
  round2,
  groupItemsByShop,
  applyShopShipping,
  computeTierDiscount,
  resolveCouponDiscount,
  allocateMerchandise,
  merchandiseTotalAfterDiscounts,
  getTierFromPoints
} from '../services/pricing.service.js'

// Quy tac tinh tien cua mot lan thanh toan da gian hang.
//
// Truoc dot tach service, toan bo phan nay nam trong createOrder nen muon cham
// vao no phai dat mot don hang that qua HTTP. Bat bien dong tien - thu quan
// trong nhat cua ca he thong - chi duoc kiem tra gian tiep qua mot vai kich ban
// co san trong seed.
//
// Gio no la ham thuan, nen kiem tra duoc bang hang tram bo so ngau nhien trong
// vai mili giay, ke ca cac to hop khong bao gio xuat hien trong du lieu mau.

const shop = (id, fee = null, threshold = null) => ({
  id: BigInt(id),
  name: 'Shop ' + id,
  owner_id: BigInt(id * 10),
  shipping_fee_override: fee,
  free_shipping_threshold_override: threshold
})

const item = (shopObj, price) => ({
  shop: shopObj,
  data: { total_price: price }
})

test('gom hang theo gian hang, cong dung tong tung shop', () => {
  const s1 = shop(1)
  const s2 = shop(2)
  const groups = groupItemsByShop([
    item(s1, 100),
    item(s2, 50),
    item(s1, 25.5)
  ])
  assert.equal(groups.size, 2)
  assert.equal(groups.get('1').subtotal, 125.5)
  assert.equal(groups.get('2').subtotal, 50)
  assert.equal(groups.get('1').items.length, 2)
})

test('phi ship: shop tu dat thi dung muc cua shop, khong thi lay cua san', () => {
  const groups = groupItemsByShop([
    item(shop(1), 50),
    item(shop(2, 4.99, 150), 50)
  ])
  const total = applyShopShipping(groups, {
    platformShippingFee: 9.99,
    platformFreeThreshold: 199
  })
  assert.equal(groups.get('1').shipping, 9.99, 'shop 1 phai dung muc cua san')
  assert.equal(groups.get('2').shipping, 4.99, 'shop 2 co muc rieng')
  assert.equal(round2(total), 14.98)
})

test('phi ship: dat nguong thi mien phi', () => {
  const groups = groupItemsByShop([item(shop(1), 250)])
  applyShopShipping(groups, { platformShippingFee: 9.99, platformFreeThreshold: 199 })
  assert.equal(groups.get('1').shipping, 0)
})

test('nguong mien phi cua shop duoc ton trong rieng', () => {
  const groups = groupItemsByShop([item(shop(2, 4.99, 150), 160)])
  applyShopShipping(groups, { platformShippingFee: 9.99, platformFreeThreshold: 199 })
  assert.equal(groups.get('2').shipping, 0, 'da vuot nguong 150 cua shop')
})

test('hang thanh vien suy ra dung tu diem', () => {
  assert.equal(getTierFromPoints(0), 'BRONZE')
  assert.equal(getTierFromPoints(499), 'BRONZE')
  assert.equal(getTierFromPoints(500), 'SILVER')
  assert.equal(getTierFromPoints(2000), 'GOLD')
  assert.equal(getTierFromPoints(5000), 'PLATINUM')
})

test('uu dai theo hang tru dung ti le', () => {
  const r = computeTierDiscount(1000, 0.05)
  assert.equal(r.totalAmount, 1000)
  assert.equal(r.tierDiscount, 50)
  assert.equal(r.amountAfterTierDiscount, 950)
})

// --- Voucher ---------------------------------------------------------------

const coupon = (over = {}) => ({
  id: 1n,
  code: 'TEST',
  discount_type: 'percent',
  discount_value: 10,
  min_order: null,
  usage_limit: null,
  used_count: 0,
  shop_id: null,
  expires_at: null,
  users: [],
  shop: null,
  ...over
})

const twoShopCart = () =>
  groupItemsByShop([item(shop(1), 200), item(shop(2), 100)])

test('voucher het han bi tu choi', () => {
  const r = resolveCouponDiscount({
    coupon: coupon({ expires_at: new Date('2020-01-01') }),
    shopGroups: twoShopCart(),
    tierDiscountRate: 0,
    amountAfterTierDiscount: 300,
    userId: '1'
  })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'COUPON_EXPIRED')
})

test('voucher het luot bi tu choi', () => {
  const r = resolveCouponDiscount({
    coupon: coupon({ usage_limit: 1, used_count: 1 }),
    shopGroups: twoShopCart(),
    tierDiscountRate: 0,
    amountAfterTierDiscount: 300,
    userId: '1'
  })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'COUPON_LIMIT_REACHED')
})

test('voucher ca nhan cua nguoi khac bi tu choi', () => {
  const r = resolveCouponDiscount({
    coupon: coupon({ users: [{ id: 99n }] }),
    shopGroups: twoShopCart(),
    tierDiscountRate: 0,
    amountAfterTierDiscount: 300,
    userId: '1'
  })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'COUPON_NOT_OWNED')
})

test('voucher cua shop khong co trong gio bi tu choi', () => {
  const r = resolveCouponDiscount({
    coupon: coupon({ shop_id: 77n, shop: { id: 77n, name: 'Vang mat' } }),
    shopGroups: twoShopCart(),
    tierDiscountRate: 0,
    amountAfterTierDiscount: 300,
    userId: '1'
  })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'COUPON_SHOP_MISSING')
})

test('voucher cua shop chi giam tren phan hang cua chinh shop do', () => {
  const r = resolveCouponDiscount({
    coupon: coupon({ shop_id: 1n, discount_value: 10 }),
    shopGroups: twoShopCart(),
    tierDiscountRate: 0,
    amountAfterTierDiscount: 300,
    userId: '1'
  })
  assert.equal(r.ok, true)
  // 10% cua 200 (rieng shop 1), khong phai 10% cua 300.
  assert.equal(r.couponDiscount, 20)
  assert.equal(r.couponShopKey, '1')
})

test('voucher cua san giam tren toan gio', () => {
  const r = resolveCouponDiscount({
    coupon: coupon({ discount_value: 10 }),
    shopGroups: twoShopCart(),
    tierDiscountRate: 0,
    amountAfterTierDiscount: 300,
    userId: '1'
  })
  assert.equal(r.ok, true)
  assert.equal(r.couponDiscount, 30)
  assert.equal(r.couponShopKey, null)
})

test('muc giam khong bao gio vuot qua gia tri hang', () => {
  const r = resolveCouponDiscount({
    coupon: coupon({ discount_type: 'fixed', discount_value: 9999 }),
    shopGroups: twoShopCart(),
    tierDiscountRate: 0,
    amountAfterTierDiscount: 300,
    userId: '1'
  })
  assert.equal(r.ok, true)
  assert.equal(r.couponDiscount, 300, 'giam toi da bang dung tien hang')
})

// --- Bat bien dong tien ----------------------------------------------------
//
// Day la thu quan trong nhat trong ca file. Neu tong cac don con khong bang
// dung so tien nguoi mua tra thi doi soat voi cong thanh toan sai, va so tien
// thuc nhan cua tung nguoi ban cung sai theo.

const rand = (min, max) => Math.random() * (max - min) + min
const randInt = (min, max) => Math.floor(rand(min, max + 1))

/** Dung mot gio hang ngau nhien roi chay het duong tinh tien. */
const runCheckout = () => {
  const shopCount = randInt(1, 5)
  const items = []
  const shops = []
  for (let s = 1; s <= shopCount; s++) {
    const useOverride = Math.random() < 0.4
    const sh = shop(
      s,
      useOverride ? round2(rand(2, 8)) : null,
      useOverride ? round2(rand(80, 200)) : null
    )
    shops.push(sh)
    const itemCount = randInt(1, 4)
    for (let i = 0; i < itemCount; i++) {
      // Gia tan cung .99 va .95 la nhung cho de sinh nua xu nhat.
      const base = randInt(5, 2000)
      const cents = [0.99, 0.95, 0.5, 0.33, 0][randInt(0, 4)]
      items.push(item(sh, round2(base + cents) * randInt(1, 5)))
    }
  }

  const shopGroups = groupItemsByShop(items)
  const totalRaw = [...shopGroups.values()].reduce((s, g) => s + g.subtotal, 0)

  const shippingTotal = applyShopShipping(shopGroups, {
    platformShippingFee: 9.99,
    platformFreeThreshold: 199
  })

  const tierRate = [0, 0.02, 0.05, 0.08][randInt(0, 3)]
  const tier = computeTierDiscount(totalRaw, tierRate)

  let couponDiscount = 0
  let couponShopKey = null
  const mode = randInt(0, 2)
  if (mode === 1) {
    const target = shops[randInt(0, shops.length - 1)]
    const r = resolveCouponDiscount({
      coupon: coupon({ shop_id: target.id, discount_value: randInt(5, 30) }),
      shopGroups,
      tierDiscountRate: tierRate,
      amountAfterTierDiscount: tier.amountAfterTierDiscount,
      userId: '1'
    })
    if (r.ok) {
      couponDiscount = r.couponDiscount
      couponShopKey = r.couponShopKey
    }
  } else if (mode === 2) {
    const r = resolveCouponDiscount({
      coupon: coupon({ discount_value: randInt(5, 30) }),
      shopGroups,
      tierDiscountRate: tierRate,
      amountAfterTierDiscount: tier.amountAfterTierDiscount,
      userId: '1'
    })
    if (r.ok) couponDiscount = r.couponDiscount
  }

  const merchandiseTotal = merchandiseTotalAfterDiscounts(
    tier.amountAfterTierDiscount,
    couponDiscount
  )
  const finalAmount = round2(merchandiseTotal + shippingTotal)

  const groups = allocateMerchandise(shopGroups, {
    merchandiseTotal,
    totalAmount: tier.totalAmount,
    tierDiscount: tier.tierDiscount,
    couponDiscount,
    couponShopKey
  })

  return { groups, finalAmount, merchandiseTotal, shippingTotal }
}

test('bat bien: tong cac don con bang dung so tien thanh toan, 500 gio hang ngau nhien', () => {
  for (let n = 0; n < 500; n++) {
    const { groups, finalAmount } = runCheckout()
    const sum = round2(groups.reduce((s, g) => s + g.finalTotal, 0))
    assert.equal(
      sum,
      finalAmount,
      `lech ${round2(sum - finalAmount)} o vong lap ${n}, ${groups.length} shop`
    )
  }
})

test('bat bien: tien hang cac don con bang dung tien hang toan don', () => {
  for (let n = 0; n < 300; n++) {
    const { groups, merchandiseTotal } = runCheckout()
    const sum = round2(groups.reduce((s, g) => s + g.merchTotal, 0))
    assert.equal(sum, round2(merchandiseTotal), `lech o vong lap ${n}`)
  }
})

test('bat bien: khong don con nao am tien', () => {
  for (let n = 0; n < 300; n++) {
    const { groups } = runCheckout()
    for (const g of groups) {
      assert.ok(g.merchTotal >= 0, `tien hang am: ${g.merchTotal}`)
      assert.ok(g.finalTotal >= 0, `tong don am: ${g.finalTotal}`)
    }
  }
})

test('don cuoi hap thu sai so lam tron: to hop tung lam lech nua xu', () => {
  // 6099.95 x 10% = 609.995. Lam tron tung don roi cong lai se lech.
  const groups = groupItemsByShop([
    item(shop(1), 6099.95),
    item(shop(2), 3050.05)
  ])
  applyShopShipping(groups, { platformShippingFee: 9.99, platformFreeThreshold: 199 })
  const tier = computeTierDiscount(9150, 0.05)
  const merchandiseTotal = merchandiseTotalAfterDiscounts(tier.amountAfterTierDiscount, 609.995)
  const finalAmount = round2(merchandiseTotal + 0)
  const out = allocateMerchandise(groups, {
    merchandiseTotal,
    totalAmount: tier.totalAmount,
    tierDiscount: tier.tierDiscount,
    couponDiscount: 609.995,
    couponShopKey: null
  })
  const sum = round2(out.reduce((s, g) => s + g.finalTotal, 0))
  assert.equal(sum, finalAmount)
})

test('gio hang mot shop: don duy nhat nhan tron so tien', () => {
  const groups = groupItemsByShop([item(shop(1), 100)])
  applyShopShipping(groups, { platformShippingFee: 9.99, platformFreeThreshold: 199 })
  const out = allocateMerchandise(groups, {
    merchandiseTotal: 100,
    totalAmount: 100,
    tierDiscount: 0,
    couponDiscount: 0,
    couponShopKey: null
  })
  assert.equal(out.length, 1)
  assert.equal(out[0].merchTotal, 100)
  assert.equal(out[0].finalTotal, 109.99)
})
