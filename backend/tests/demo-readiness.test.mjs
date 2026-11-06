import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'
import { prisma } from '../lib/db.js'

// Kiem tra SAN SANG DEMO - chay ngay truoc khi bao ve, khong nam trong `npm test`.
//
//   npm run test:demo
//
// Khac voi 9 suite hoi quy (chung seed lai du lieu roi kiem chung nghiep vu),
// suite nay chay tren DUNG du lieu se dem di demo va CHI DOC - khong tao don,
// khong dinh chi shop, khong doi trang thai gi. Muc dich la bat truoc nhung
// trang thai lam vo buoi demo, dac biet la bang embedding rong sau khi seed.
//
// Mac dinh khong goi Gemini (mien phi, chay trong vai giay). Muon kiem chung
// ca duong RAG that su thi dat DEMO_CHECK_AI=1 - se ton mot luot goi Gemini.

const CHECK_AI = ['1', 'true', 'yes'].includes(
  String(process.env.DEMO_CHECK_AI || '').toLowerCase()
)

test.after(async () => {
  await prisma.$disconnect()
})

// ---------------------------------------------------------------- nen tang

test('backend dang chay va tra ve du lieu san pham', async () => {
  const res = await req('/products?limit=1')
  assert.equal(res.status, 200, 'backend chua chay? chay `npm run dev` truoc')
  assert.ok(
    (res.json?.products?.length ?? 0) > 0,
    'khong co san pham nao - can chay `npm run seed:full`'
  )
})

test('ca 5 tai khoan demo trong README deu dang nhap duoc', async () => {
  const accounts = [
    ['admin', ACCOUNTS.admin],
    ['seller1 (Tech World)', ACCOUNTS.seller1],
    ['seller2 (Gadget Hub)', ACCOUNTS.seller2],
    ['nguoi mua', ACCOUNTS.buyer2],
    ['nguoi cho duyet', 'seller3@example.com']
  ]
  for (const [label, email] of accounts) {
    const res = await req('/auth/login', {
      method: 'POST',
      body: { email, password: 'password123' }
    })
    assert.equal(res.status, 200, `${label} (${email}) dang nhap that bai`)
    assert.ok(res.json?.data?.accessToken, `${label} khong nhan duoc token`)
  }
})

// ------------------------------------------------- Man 1: nguoi mua + AI

test('RAG san sang: bang product_embeddings khong rong', async () => {
  const rows = await prisma.$queryRaw`
    SELECT count(*)::int AS n FROM product_embeddings WHERE embedding IS NOT NULL`
  const n = rows?.[0]?.n ?? 0
  assert.ok(
    n > 0,
    'product_embeddings rong -> chatbot se am tham chi tim theo tu khoa. ' +
      'Chay `npm run embed:products` hoac khoi dong lai backend.'
  )
})

test('moi san pham dang ban deu co embedding', async () => {
  const rows = await prisma.$queryRaw`
    SELECT count(*)::int AS n
    FROM products p
    JOIN shops s ON s.id = p.shop_id AND s.status = 'active' AND s.deleted_at IS NULL
    LEFT JOIN product_embeddings pe ON pe.product_id = p.id
    WHERE p.deleted_at IS NULL AND pe.product_id IS NULL`
  assert.equal(
    rows?.[0]?.n ?? 0,
    0,
    'co san pham chua duoc embed -> chatbot khong tu van duoc nhung san pham do'
  )
})

test('endpoint tim kiem bang anh dang phuc vu', async () => {
  const res = await req('/products/search-by-image', { method: 'POST' })
  // Thieu file anh -> phai la loi dau vao (4xx), khong duoc la 404/5xx.
  assert.ok(
    res.status >= 400 && res.status < 500,
    `mong doi 4xx khi thieu anh, nhan duoc ${res.status}`
  )
  assert.notEqual(res.status, 404, 'route tim bang anh khong ton tai')
})

test('endpoint so sanh AI dang phuc vu', async () => {
  const res = await req('/products/compare-ai', {
    method: 'POST',
    body: { productIds: [] }
  })
  assert.notEqual(res.status, 404, 'route so sanh AI khong ton tai')
  assert.ok(res.status < 500, `loi may chu ${res.status}`)
})

test('goi y trang chu tra ve san pham', async () => {
  const res = await req('/recommendations/home?limit=4')
  assert.equal(res.status, 200)
  assert.ok(
    (res.json?.data?.products?.length ?? 0) > 0,
    'khong co goi y nao - kiem tra job goi y da chay chua'
  )
  assert.ok(res.json?.data?.strategy, 'thieu ten chien luoc goi y')
})

test('san pham tuong tu co du lieu (dung cho khoi Similar Products)', async () => {
  const list = await req('/shops/tech-world/products?limit=1')
  const productId = list.json?.products?.[0]?.id
  assert.ok(productId, 'Tech World khong co san pham nao')
  const res = await req(`/products/${productId}/similar?limit=4`)
  assert.equal(res.status, 200)
  assert.ok(
    (res.json?.products?.length ?? 0) > 0,
    'khong co san pham tuong tu - chay `npm run job:cf-similarity`'
  )
})

// -------------------------------------------------- Man 1: gian hang + voucher

test('hai gian hang demo deu dang hoat dong va co hang', async () => {
  for (const slug of ['tech-world', 'gadget-hub']) {
    const shop = await req(`/shops/${slug}`)
    assert.equal(shop.status, 200, `shop ${slug} khong truy cap duoc`)
    assert.equal(shop.json?.data?.status, 'active', `shop ${slug} khong active`)

    const products = await req(`/shops/${slug}/products?limit=3`)
    assert.ok(
      (products.json?.products?.length ?? 0) > 0,
      `shop ${slug} khong co san pham`
    )
  }
})

test('Gadget Hub giu phi ship rieng de demo tach don', async () => {
  // Endpoint /shops/:slug cong khai co y khong phoi phi ship (phi duoc tinh o
  // server luc dung gio hang / thanh toan), nen kiem tra thang nguon su that.
  const shop = await prisma.shop.findUnique({
    where: { slug: 'gadget-hub' },
    select: {
      shipping_fee_override: true,
      free_shipping_threshold_override: true
    }
  })
  assert.ok(shop, 'khong tim thay shop gadget-hub')
  assert.equal(
    Number(shop.shipping_fee_override),
    4.99,
    'mat phi ship rieng -> man demo phi ship theo shop se khong noi bat'
  )
  assert.equal(
    Number(shop.free_shipping_threshold_override),
    150,
    'mat nguong freeship rieng cua Gadget Hub'
  )
})

test('bon ma voucher trong README deu con hieu luc', async () => {
  const vouchers = [
    ['WELCOME10', 500],
    ['FLAT50', 500],
    ['TECHWORLD10', 500],
    ['GADGET5', 100]
  ]
  for (const [code, amount] of vouchers) {
    const res = await req('/coupons/validate', {
      method: 'POST',
      body: { code, amount }
    })
    assert.equal(res.status, 200, `voucher ${code} khong hop le nua`)
    assert.ok(Number(res.json?.discount) > 0, `voucher ${code} giam 0 dong`)
  }
})

test('voucher cua shop hien tren trang gian hang de nguoi mua copy', async () => {
  const res = await req('/coupons/shop/tech-world')
  assert.equal(res.status, 200)
  const codes = (res.json?.data?.coupons ?? []).map(c => c.code)
  assert.ok(
    codes.includes('TECHWORLD10'),
    `trang shop khong hien TECHWORLD10 (dang co: ${codes.join(', ') || 'khong co'})`
  )
})

// ------------------------------------------------------- Man 2: nguoi ban

test('seller vao duoc dashboard va thay khoi doanh thu / phi san', async () => {
  const seller1 = await login(ACCOUNTS.seller1)
  const shop = await req('/shops/me', { token: seller1 })
  assert.equal(shop.status, 200)
  assert.equal(shop.json?.data?.slug, 'tech-world')

  const stats = await req('/dashboard/shop/stats', { token: seller1 })
  assert.equal(stats.status, 200)
  for (const key of ['revenue', 'commission', 'orders', 'pending']) {
    assert.ok(
      key in (stats.json?.data ?? {}),
      `dashboard thieu truong "${key}" - man demo dong tien se hong`
    )
  }
})

test('seller xem duoc danh sach don va san pham cua shop minh', async () => {
  const seller1 = await login(ACCOUNTS.seller1)
  for (const path of ['/orders/shop/mine', '/products/shop/mine']) {
    const res = await req(path, { token: seller1 })
    assert.equal(res.status, 200, `${path} tra ve ${res.status}`)
  }
})

// -------------------------------------------------------- Man 3: quan tri

test('con don mo shop dang cho de admin bam duyet', async () => {
  const admin = await login(ACCOUNTS.admin)
  const res = await req('/shops/admin/all?status=pending', { token: admin })
  assert.equal(res.status, 200)
  const names = (res.json?.data?.shops ?? []).map(s => s.name)
  assert.ok(
    names.length > 0,
    'khong con shop nao cho duyet -> Man 3 khong demo duoc. Chay `npm run seed:full`.'
  )
  assert.ok(
    names.includes('New Corner Store'),
    `thieu don seed "New Corner Store" (dang cho: ${names.join(', ')})`
  )
})

test('admin mo duoc dashboard tong va danh sach don', async () => {
  const admin = await login(ACCOUNTS.admin)
  for (const path of ['/dashboard/stats', '/orders', '/customers', '/coupons']) {
    const res = await req(path, { token: admin })
    assert.equal(res.status, 200, `${path} tra ve ${res.status}`)
  }
})

// ------------------------------------------------------------ tuy chon: AI that

test('chatbot RAG tra loi that va truy hoi dung san pham tren san', async t => {
  if (!CHECK_AI) {
    return t.skip('dat DEMO_CHECK_AI=1 de goi Gemini that (ton mot luot quota)')
  }
  const buyer = await login(ACCOUNTS.buyer2)
  const chat = await req('/ai-assistant', {
    method: 'POST',
    token: buyer,
    body: { title: 'kiem tra san sang demo' }
  })
  const chatId = chat.json?.data?.id
  assert.ok(chatId, 'khong tao duoc phien chat AI')

  const reply = await req(`/ai-assistant/${chatId}/messages`, {
    method: 'POST',
    token: buyer,
    body: { content: 'Tu van cho toi mot chiec dien thoai chup anh dep' }
  })
  assert.equal(reply.status, 200, 'chatbot khong tra loi - kiem tra GEMINI_API_KEY')
  const text = String(reply.json?.data?.reply ?? '')
  assert.ok(text.length > 0, 'chatbot tra ve cau tra loi rong')
  assert.match(
    text,
    /\/product\//,
    'cau tra loi khong dinh kem link san pham nao -> truy hoi RAG dang hong'
  )
})
