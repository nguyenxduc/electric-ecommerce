import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { API, PASSWORD, clearCart } from '../e2e/helpers'

// Tour demo co thuyet minh: quay mot video duy nhat di qua 3 vai tro + AI.
// Chay: npm run demo:record (xem package.json). Bien moi truong: DEMO_SLOWMO, DEMO_PACE,
// DEMO_HEADED=1. Anh chup tung canh (tuy chon):
// dat bien moi truong DEMO_SHOTS=<thu muc>.

const SHOTS = process.env.DEMO_SHOTS
const BUYER = 'john@example.com'
const SELLER = 'seller1@example.com'
const ADMIN = 'admin@example.com'

// Banner chu thich + cham do khi click: init script chay lai sau moi lan dieu huong,
// noi dung lay tu sessionStorage nen banner song qua reload / goto.
const overlayScript = () => {
  const render = () => {
    if (!document.body) return
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem('demoCaption')
    } catch {
      return
    }
    let box = document.getElementById('demo-caption')
    if (!raw) {
      box?.remove()
      return
    }
    const { title, subtitle, pos } = JSON.parse(raw)
    if (!box) {
      box = document.createElement('div')
      box.id = 'demo-caption'
      document.body.appendChild(box)
    }
    box.style.cssText = [
      'position:fixed',
      pos === 'bottom' ? 'bottom:28px' : pos === 'center' ? 'top:38%' : 'top:16px',
      'left:50%',
      'transform:translateX(-50%)',
      'max-width:78%',
      'padding:14px 28px',
      'border-radius:14px',
      'background:rgba(15,23,42,0.82)',
      'color:#fff',
      'text-align:center',
      'font-family:"Segoe UI",Roboto,Arial,sans-serif',
      'box-shadow:0 8px 30px rgba(0,0,0,0.35)',
      'z-index:2147483647',
      'pointer-events:none'
    ].join(';')
    box.innerHTML = ''
    const h = document.createElement('div')
    h.textContent = title
    h.style.cssText = 'font-size:30px;font-weight:700;line-height:1.25'
    box.appendChild(h)
    if (subtitle) {
      const s = document.createElement('div')
      s.textContent = subtitle
      s.style.cssText = 'font-size:19px;margin-top:6px;opacity:0.92;line-height:1.35'
      box.appendChild(s)
    }
  }
  ;(window as unknown as { __demoCaption: () => void }).__demoCaption = render
  document.addEventListener('DOMContentLoaded', render)
  // React co the ve lai body: kiem tra dinh ky cho chac
  setInterval(() => {
    if (!document.getElementById('demo-caption')) render()
  }, 500)
  document.addEventListener(
    'mousedown',
    e => {
      const dot = document.createElement('div')
      dot.style.cssText = `position:fixed;left:${e.clientX - 14}px;top:${e.clientY - 14}px;width:28px;height:28px;border-radius:50%;background:rgba(239,68,68,0.45);border:3px solid #ef4444;z-index:2147483646;pointer-events:none;transition:opacity .6s,transform .6s`
      document.body.appendChild(dot)
      setTimeout(() => {
        dot.style.opacity = '0'
        dot.style.transform = 'scale(1.8)'
      }, 300)
      setTimeout(() => dot.remove(), 1000)
    },
    true
  )
}

async function caption(page: Page, title: string, subtitle = '', pos: 'top' | 'bottom' | 'center' = 'top') {
  await page.evaluate(
    c => {
      sessionStorage.setItem('demoCaption', JSON.stringify(c))
      ;(window as unknown as { __demoCaption?: () => void }).__demoCaption?.()
    },
    { title, subtitle, pos }
  )
}

// DEMO_PACE nhan thoi gian dung doc (mac dinh 2 => tour ~6-7 phut)
const PACE = Number(process.env.DEMO_PACE ?? 2)
const pause = (ms: number) => new Promise(r => setTimeout(r, ms * PACE))

let shotNo = 0
async function shot(page: Page, name: string) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${String(++shotNo).padStart(2, '0')}-${name}.png`) })
}

// Cuon trang cham de nguoi xem theo kip
async function slowScroll(page: Page, total: number, step = 120) {
  for (let y = 0; y < total; y += step) {
    await page.mouse.wheel(0, step)
    await pause(140)
  }
}

const apiToken = async (page: Page, email: string) => {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } })
  expect(res.ok(), `login ${email}`).toBeTruthy()
  return (await res.json()).data.accessToken as string
}

// Doi vai tro: dat token vao localStorage (khong dung addInitScript de khong ghi de vai tro sau)
async function switchTo(page: Page, email: string, to: string) {
  const token = await apiToken(page, email)
  await page.context().clearCookies()
  await page.evaluate(t => localStorage.setItem('accessToken', t), token)
  await page.goto(to)
  await page.waitForLoadState('networkidle')
  return token
}

async function logout(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.removeItem('accessToken'))
}

// Lay ma OTP xac minh email truc tiep tu DB (moi truong dev khong gui mail that)
function readOtp(email: string): string {
  const backend = path.resolve(process.cwd(), '..', 'backend')
  const script = `import 'dotenv/config'; import { prisma } from './lib/db.js';
    const u = await prisma.user.findUnique({ where: { email: ${JSON.stringify(email)} }, select: { verification_code: true } });
    process.stdout.write(String(u?.verification_code ?? '')); await prisma.$disconnect();`
  return execFileSync('node', ['--input-type=module', '-e', script], { cwd: backend, encoding: 'utf8' }).trim()
}

// Buoc phu (AI, popup...): loi thi ghi chu thich va di tiep, khong lam hong ca tour
async function soft(page: Page, label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (err) {
    console.warn(`[demo] bo qua "${label}": ${(err as Error).message.split('\n')[0]}`)
  }
}

test('demo tour NGX E-Commerce', async ({ page, context }) => {
  test.setTimeout(15 * 60_000)
  await context.addInitScript(overlayScript)
  page.setDefaultTimeout(20_000)

  // --- Chuan bi du lieu (khong quay lai cho nguoi xem) ---
  const buyerToken = await apiToken(page, BUYER)
  const buyerAuth = { Authorization: `Bearer ${buyerToken}` }
  await clearCart(page, buyerToken)
  const tw = (
    (await (await page.request.get(`${API}/coupons/shop/tech-world`, { headers: buyerAuth })).json()).data
      .coupons as { id: number; code: string }[]
  ).find(c => c.code === 'TECHWORLD10')
  if (tw) await page.request.delete(`${API}/coupons/${tw.id}/claim`, { headers: buyerAuth })
  // San pham Gadget Hub khong co bien the, con hang
  const ghList = (await (await page.request.get(`${API}/shops/gadget-hub/products?limit=50`)).json()).products as {
    id: number
    name: string
    quantity: number
    variants?: unknown[]
  }[]
  const gadget = ghList.filter(p => !p.variants?.length && p.quantity > 5).sort((a, b) => b.quantity - a.quantity)[0]
  const orderNumbers: string[] = []
  const stamp = Date.now()
  const newUser = { name: 'Demo Seller', email: `demo${stamp}@example.com` }
  const newShop = `Demo Shop ${String(stamp).slice(-5)}`

  await test.step('a. Trang chủ sàn', async () => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await caption(page, 'NGX E-Commerce — Sàn TMĐT đa gian hàng', 'Trang chủ: banner, danh mục, Top deals, gian hàng nổi bật')
    await shot(page, 'home')
    await pause(3500)
    await caption(page, 'Khám phá trang chủ', 'Danh mục sản phẩm, Top deals và các shop nổi bật', 'bottom')
    await slowScroll(page, 2600)
    await pause(1500)
    await shot(page, 'home-scrolled')
    await slowScroll(page, 1800)
    await pause(1500)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await pause(1500)
  })

  await test.step('b. Người mua tìm kiếm và thêm vào giỏ', async () => {
    await caption(page, 'Vai trò 1: Người mua', 'Đăng nhập bằng tài khoản john@example.com', 'bottom')
    await page.getByRole('button', { name: 'Login / Sign Up' }).click()
    await page.getByPlaceholder('E-mail', { exact: true }).pressSequentially(BUYER, { delay: 40 })
    await page.getByPlaceholder('Password', { exact: true }).pressSequentially(PASSWORD, { delay: 40 })
    await pause(600)
    await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
    await expect(page.getByRole('button', { name: 'Login / Sign Up' })).toBeHidden()
    await pause(1500)

    await caption(page, 'Tìm kiếm sản phẩm', 'Gõ "lap" — hệ thống tìm theo từ khoá và ngữ nghĩa', 'bottom')
    // O tim kiem nam trong popup mo tu icon kinh lup tren header
    const search = page.getByPlaceholder('Search products or categories').first()
    const openSearch = async () => {
      if (!(await search.isVisible())) await page.getByRole('button', { name: 'Open search' }).click()
      await search.click()
    }
    await openSearch()
    await search.pressSequentially('lap', { delay: 180 })
    await pause(2000)
    await shot(page, 'search-suggest')
    await search.press('Enter')
    await expect(page).toHaveURL(/search=lap/)
    await page.waitForLoadState('networkidle')
    await pause(2500)
    await shot(page, 'search-results')
    await slowScroll(page, 600)
    await pause(1500)

    await caption(page, 'Mở chi tiết sản phẩm', 'Tìm "Xiaomi 14" và mở trang sản phẩm', 'bottom')
    await page.evaluate(() => window.scrollTo(0, 0))
    await openSearch()
    await search.fill('')
    await search.pressSequentially('Xiaomi 14', { delay: 120 })
    await search.press('Enter')
    await expect(page).toHaveURL(/search=Xiaomi/)
    await page.waitForLoadState('networkidle')
    await pause(1500)
    await page.getByRole('heading', { name: 'Xiaomi 14', level: 3 }).first().click()
    await expect(page.getByRole('heading', { name: 'Xiaomi 14', level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await pause(2000)

    await caption(page, 'Chọn biến thể', 'Bản 512GB — giá tự cập nhật theo biến thể', 'bottom')
    await page.getByRole('button', { name: '512GB', exact: true }).click()
    await pause(2000)
    await shot(page, 'detail-variant')

    await caption(page, 'Voucher của shop', 'Lưu mã TECHWORLD10 (giảm 10%, đơn từ $50) vào kho voucher', 'bottom')
    const card = page.getByTestId('shop-voucher-TECHWORLD10')
    await card.scrollIntoViewIfNeeded()
    await pause(1200)
    const collect = card.getByRole('button', { name: 'Collect' })
    if (await collect.isVisible()) await collect.click()
    await expect(card.getByText('Collected')).toBeVisible()
    await pause(1800)
    await shot(page, 'voucher-collected')

    await caption(page, 'Thêm vào giỏ hàng', 'Xiaomi 14 — 512GB từ shop Tech World', 'bottom')
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await pause(800)
    await page.getByRole('button', { name: 'Add to Cart' }).click()
    await expect(page.getByText('Added to cart successfully')).toBeVisible()
    await pause(2000)
  })

  await test.step('c. Giỏ hàng nhóm theo shop', async () => {
    await caption(page, 'Thêm sản phẩm của shop khác', `${gadget.name} — shop Gadget Hub`, 'bottom')
    await page.goto(`/product/item-p${gadget.id}`)
    await page.waitForLoadState('networkidle')
    await pause(2000)
    await page.getByRole('button', { name: 'Add to Cart' }).click()
    await expect(page.getByText('Added to cart successfully').first()).toBeVisible()
    await pause(1500)

    await caption(page, 'Giỏ hàng nhóm theo từng shop', 'Mỗi shop một nhóm — chọn sản phẩm muốn thanh toán', 'bottom')
    await page.goto('/cart')
    await page.waitForLoadState('networkidle')
    await pause(3000)
    await shot(page, 'cart')
    // Bo chon roi chon lai mot dong de minh hoa chon san pham
    const row = page.getByRole('checkbox', { name: new RegExp(`^Select ${gadget.name.split(' ')[0]}`) }).first()
    await soft(page, 'toggle cart item', async () => {
      await row.uncheck({ timeout: 4000 })
      await pause(1500)
      await row.check()
    })
    await pause(1500)
  })

  await test.step('d. Thanh toán tách đơn theo shop', async () => {
    await caption(page, 'Thanh toán', 'Địa chỉ giao hàng, phí ship tính riêng cho từng shop')
    await page.getByRole('button', { name: /Proceed to checkout/ }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await page.waitForLoadState('networkidle')
    await pause(1500)
    const deliver = page.getByTestId('deliver-to')
    if (!(await deliver.isVisible().catch(() => false))) {
      const type = async (ph: string, v: string, exact = false) => {
        const el = page.getByPlaceholder(ph, { exact })
        if (!(await el.inputValue())) await el.pressSequentially(v, { delay: 30 })
      }
      await type('Full name', 'John Doe')
      await type('Phone number', '0912345678')
      await type('Province / City', 'Ho Chi Minh')
      await type('District', 'Quan 1', true)
      await type('Ward', 'Ben Nghe', true)
      await type('Street, city, district...', '1 Le Loi')
    }
    await expect(page.getByText(/Shipping \(Tech World\)/)).toBeVisible()
    await expect(page.getByText(/Shipping \(Gadget Hub\)/)).toBeVisible()
    await page.waitForLoadState('networkidle')
    await pause(2500)
    await shot(page, 'checkout')

    await caption(page, 'Chọn voucher', 'Kho voucher: TECHWORLD10 chỉ giảm cho phần hàng Tech World')
    await page.getByRole('button', { name: 'Vouchers', exact: true }).click()
    const v = page.getByTestId('checkout-voucher-TECHWORLD10')
    await expect(v).toBeVisible()
    await pause(2000)
    await shot(page, 'voucher-picker')
    const choose = v.getByRole('button', { name: 'Choose' })
    if (await choose.isVisible()) await choose.click()
    else await page.getByRole('button', { name: 'Close' }).first().click()
    await expect(page.getByText(/Applied:/)).toBeVisible()
    await pause(2500)
    await shot(page, 'voucher-applied')

    await caption(page, 'Đặt hàng COD', 'Một lần thanh toán — hệ thống tách thành 2 đơn, mỗi shop một đơn')
    await page.getByRole('button', { name: 'Place order (COD)' }).click()
    await expect(page).toHaveURL(/payment-result\?method=cod/)
    await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
    orderNumbers.push(...(new URL(page.url()).searchParams.get('orders') || '').split(',').filter(Boolean))
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, 0))
    await pause(3500)
    await shot(page, 'payment-result')
    await slowScroll(page, 500)
    await pause(1000)

    await caption(page, 'Đơn hàng của tôi', 'Theo dõi đơn theo tab trạng thái như app sàn', 'bottom')
    await page.getByRole('button', { name: 'View order' }).click()
    await expect(page).toHaveURL(/tab=orders/)
    await page.waitForLoadState('networkidle')
    await pause(2500)
    const mine = page.locator('div.rounded-xl').filter({ hasText: orderNumbers[0] }).first()
    await mine.getByRole('button', { name: /View details/ }).click()
    await page.waitForLoadState('networkidle')
    await pause(3000)
    await shot(page, 'order-detail')
  })

  await test.step('e. Trợ lý AI', async () => {
    await caption(page, 'Trợ lý mua sắm AI (RAG + Gemini)', 'Hỏi tư vấn bằng tiếng Việt, AI gợi ý sản phẩm thật trong sàn', 'bottom')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await pause(1000)
    let ok = false
    await soft(page, 'AI chat', async () => {
      await page.getByRole('button', { name: 'Open AI assistant' }).click()
      const box = page.getByPlaceholder('Message…')
      await expect(box).toBeVisible()
      await pause(1000)
      await box.pressSequentially('Tư vấn điện thoại chụp ảnh đẹp tầm 1000 đô', { delay: 45 })
      const reply = page.waitForResponse(r => /\/ai-assistant\/[^/]+\/messages/.test(r.url()) && r.request().method() === 'POST', {
        timeout: 60_000
      })
      await page.getByRole('button', { name: 'Send message' }).click()
      const res = await reply
      ok = res.ok()
      await pause(ok ? 6000 : 1000)
      await shot(page, 'ai-reply')
    })
    if (!ok) {
      await caption(page, 'AI đang bận', 'Dịch vụ AI tạm thời không phản hồi — tiếp tục phần demo tiếp theo', 'bottom')
      await pause(3000)
    }
    await soft(page, 'close AI', async () => {
      await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 3000 })
    })
  })

  await test.step('f. Người bán xử lý đơn', async () => {
    await logout(page)
    await switchTo(page, SELLER, '/seller')
    await caption(page, 'Vai trò 2: Người bán (Tech World)', 'Seller dashboard: việc cần làm, doanh thu, đơn chờ xử lý')
    await pause(3500)
    await shot(page, 'seller-dashboard')

    await caption(page, 'Xác nhận đơn mới', 'To-do → To confirm: đơn người mua vừa đặt', 'bottom')
    await page.getByRole('link', { name: /To confirm/ }).click()
    await expect(page).toHaveURL(/status=pending/)
    await page.waitForLoadState('networkidle')
    const row = page.getByRole('row').filter({ hasText: new RegExp(orderNumbers.join('|')) }).first()
    await expect(row).toBeVisible()
    const rowText = (await row.textContent()) || ''
    const myOrder = orderNumbers.find(n => rowText.includes(n))!
    await pause(2000)
    await row.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText('Order confirmed - ready to ship')).toBeVisible()
    await pause(2000)

    await caption(page, 'Giao hàng', 'Tạo vận đơn, in nhãn và mô phỏng hành trình giao hàng', 'bottom')
    await page.goto('/seller/orders')
    const searchBox = page.getByPlaceholder('Search order no., buyer, phone, tracking')
    await searchBox.pressSequentially(myOrder, { delay: 30 })
    await searchBox.press('Enter')
    await page.getByRole('link', { name: `#${myOrder}` }).first().click()
    await expect(page).toHaveURL(/\/seller\/orders\/\d+/)
    await page.waitForLoadState('networkidle')
    await pause(2500)
    await shot(page, 'seller-order-detail')
    await page.getByRole('button', { name: 'Create shipment' }).click()
    await expect(page.getByRole('button', { name: 'Print label' })).toBeVisible()
    await pause(2000)
    await soft(page, 'print label', async () => {
      const popup = context.waitForEvent('page', { timeout: 8000 })
      await page.getByRole('button', { name: 'Print label' }).click()
      const label = await popup
      await label.waitForLoadState()
      await pause(1500)
      await label.close()
    })
    await soft(page, 'simulate delivery', async () => {
      const sim = page.getByRole('combobox').filter({ hasText: 'Simulate...' })
      await sim.selectOption('in_transit', { timeout: 5000 })
      await pause(2000)
      await sim.selectOption('delivered')
      await expect(page.locator('span.capitalize', { hasText: /^delivered$/ }).first()).toBeVisible()
      await pause(2500)
      await shot(page, 'seller-delivered')
    })

    await caption(page, 'Thu nhập của shop', 'Doanh thu − phí sàn = thực nhận; tiền về khi đơn hoàn tất', 'bottom')
    await page.goto('/seller')
    await page.getByRole('link', { name: 'My Income' }).click()
    await expect(page.getByRole('heading', { name: 'My Income' })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await pause(3500)
    await shot(page, 'seller-income')

    await caption(page, 'Voucher của shop', 'Seller tự tạo, tạm dừng và bật lại voucher', 'bottom')
    await page.goto('/seller/coupons')
    const vRow = page.getByTestId('seller-coupon-TECHWORLD10')
    await expect(vRow).toBeVisible()
    await pause(2000)
    await soft(page, 'pause voucher', async () => {
      await vRow.getByRole('button', { name: 'Pause TECHWORLD10' }).click({ timeout: 4000 })
      await expect(vRow).toContainText('Paused')
      await pause(1500)
      await vRow.getByRole('button', { name: 'Resume TECHWORLD10' }).click()
      await expect(vRow).toContainText('Active')
    })
    await pause(1500)
  })

  await test.step('g. Đăng ký bán hàng', async () => {
    await logout(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await caption(page, 'Người dùng mới đăng ký tài khoản', 'Tạo tài khoản → xác minh email bằng mã OTP', 'bottom')
    await page.getByRole('button', { name: 'Login / Sign Up' }).click()
    await page.getByRole('button', { name: 'Create Account' }).first().click()
    await page.getByPlaceholder('Full Name').pressSequentially(newUser.name, { delay: 40 })
    await page.getByPlaceholder('E-mail', { exact: true }).pressSequentially(newUser.email, { delay: 25 })
    await page.getByPlaceholder('Password', { exact: true }).pressSequentially(PASSWORD, { delay: 25 })
    await page.getByPlaceholder('Confirm Password').pressSequentially(PASSWORD, { delay: 25 })
    await page.locator('form input[type="checkbox"]').last().check()
    await pause(1000)
    await page.locator('form button[type="submit"]').click()
    const code = page.getByPlaceholder('Enter 6-digit code')
    await expect(code).toBeVisible()
    await pause(1500)
    let otp = ''
    await expect.poll(() => (otp = readOtp(newUser.email)), { timeout: 10_000 }).toMatch(/^\d{4,8}$/)
    await code.pressSequentially(otp, { delay: 120 })
    await page.locator('form button[type="submit"]').click()
    await pause(1500)
    // Xac minh xong: dang nhap neu modal chua tu dang nhap
    const loginBtn = page.getByRole('button', { name: 'Login / Sign Up' })
    if (await loginBtn.isVisible()) {
      const emailBox = page.getByPlaceholder('E-mail', { exact: true })
      if (!(await emailBox.isVisible())) await loginBtn.click()
      await emailBox.fill(newUser.email)
      await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
      await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
      await expect(loginBtn).toBeHidden()
    }
    await pause(1500)

    await caption(page, 'Đăng ký mở shop', 'Profile → Sell on Marketplace → biểu mẫu 4 bước', 'bottom')
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Sell on Marketplace' }).click()
    await pause(1500)
    await page.getByRole('button', { name: 'Register now' }).click()
    await pause(1000)
    await caption(page, 'Bước 1/4: Thông tin shop', newShop, 'bottom')
    await page.getByPlaceholder('e.g. Tech Corner').pressSequentially(newShop, { delay: 40 })
    await page.getByPlaceholder('e.g. Genuine laptops').pressSequentially('Phụ kiện công nghệ chính hãng', { delay: 25 })
    await page.getByPlaceholder('0912345678').pressSequentially('0912345678', { delay: 30 })
    await pause(1000)
    await shot(page, 'wizard-1')
    await page.getByRole('button', { name: 'Next' }).click()
    await caption(page, 'Bước 2/4: Địa chỉ lấy hàng', '', 'bottom')
    await page.getByPlaceholder('Ha Noi').pressSequentially('Ha Noi', { delay: 30 })
    await page.getByPlaceholder('Hoan Kiem').pressSequentially('Hoan Kiem', { delay: 30 })
    await page.getByPlaceholder('Trang Tien').pressSequentially('Trang Tien', { delay: 30 })
    await page.getByPlaceholder('House number, street name').pressSequentially('1 Trang Tien', { delay: 30 })
    await pause(1000)
    await page.getByRole('button', { name: 'Next' }).click()
    await caption(page, 'Bước 3/4: Loại hình kinh doanh', 'Cá nhân hoặc doanh nghiệp (doanh nghiệp bắt buộc mã số thuế)', 'bottom')
    await pause(2000)
    await shot(page, 'wizard-3')
    await page.getByRole('button', { name: 'Next' }).click()
    await caption(page, 'Bước 4/4: Xem lại và gửi hồ sơ', 'Đồng ý điều khoản → Submit application', 'bottom')
    await pause(2000)
    await page.getByRole('checkbox').check()
    await pause(800)
    await page.getByRole('button', { name: 'Submit application' }).click()
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, 0))
    await pause(3000)
    await shot(page, 'wizard-submitted')
  })

  await test.step('h. Quản trị viên kiểm duyệt', async () => {
    await logout(page)
    await switchTo(page, ADMIN, '/admin')
    await caption(page, 'Vai trò 3: Quản trị sàn', 'Admin dashboard: việc cần làm, số liệu toàn sàn')
    await pause(3500)
    await shot(page, 'admin-dashboard')

    await caption(page, 'Duyệt hồ sơ mở shop', `To-do → Shop applications → ${newShop}`, 'bottom')
    await page.getByRole('link', { name: /Shop applications/ }).click()
    await expect(page).toHaveURL(/\/admin\/shops/)
    await page.waitForLoadState('networkidle')
    const row = page.getByRole('row', { name: new RegExp(newShop) })
    await expect(row).toBeVisible()
    await pause(2000)
    await row.getByRole('button', { name: 'Review' }).click()
    const dialog = page.getByRole('dialog', { name: `Application of ${newShop}` })
    await expect(dialog).toBeVisible()
    await pause(3000)
    await shot(page, 'admin-review')
    await dialog.getByRole('button', { name: 'Approve' }).click()
    // Co the co hop thoai xac nhan thu hai
    await soft(page, 'confirm approve', async () => {
      await page.getByRole('button', { name: /^(Approve|Confirm)$/ }).last().click({ timeout: 3000 })
    })
    await expect(page.getByText('Shop approved')).toBeVisible()
    await pause(2500)

    await caption(page, 'Kiểm duyệt sản phẩm', 'Gỡ sản phẩm vi phạm kèm lý do, sau đó khôi phục', 'bottom')
    await page.goto(`/admin/products?q=${encodeURIComponent(gadget.name)}`)
    await page.waitForLoadState('networkidle')
    const pRow = page.getByRole('row').filter({ hasText: gadget.name }).first()
    await expect(pRow).toBeVisible()
    await pause(2000)
    await pRow.getByRole('button', { name: `Take down ${gadget.name}` }).click()
    await pause(1200)
    await page.getByRole('button', { name: 'Counterfeit', exact: true }).click()
    await pause(1200)
    await shot(page, 'admin-takedown')
    await page.getByRole('button', { name: 'Take down', exact: true }).click()
    await expect(pRow.getByText('Taken down', { exact: true })).toBeVisible()
    await pause(2500)
    // Luon khoi phuc lai san pham
    await pRow.getByRole('button', { name: `Restore ${gadget.name}` }).click()
    await expect(pRow.getByText('Live', { exact: true })).toBeVisible()
    await pause(2000)

    await caption(page, 'Quản lý người dùng', 'Lọc theo vai trò: người mua, người bán, quản trị', 'bottom')
    await page.goto('/admin/customers')
    await page.waitForLoadState('networkidle')
    await pause(1500)
    await soft(page, 'role filter', async () => {
      const roleSelect = page.getByRole('combobox').filter({ has: page.locator('option', { hasText: /seller/i }) }).first()
      const opt = await roleSelect.locator('option', { hasText: /seller/i }).first().getAttribute('value', { timeout: 3000 })
      await roleSelect.selectOption(opt!)
      await page.waitForLoadState('networkidle')
    })
    await pause(3000)
    await shot(page, 'admin-customers')
  })

  await test.step('i. Kết thúc', async () => {
    await logout(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await caption(
      page,
      'Tổng kết NGX E-Commerce',
      '3 vai trò (người mua · người bán · quản trị) · Trợ lý AI · Tách đơn theo shop · Voucher shop · Kiểm duyệt',
      'center'
    )
    await shot(page, 'end')
    await pause(7000)
  })

  // Dọn giỏ người mua sau demo
  await clearCart(page, buyerToken)
})
