import { test, expect, type Page } from '@playwright/test'
import { API, clearCart, loginAs } from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

const overflowX = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

test('mobile: buyer pages have no horizontal scroll, filters collapse', async ({ page }) => {
  for (const url of ['/', '/collection/smartphones', '/shop/tech-world']) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    expect(await overflowX(page), url).toBeLessThanOrEqual(0)
  }
  // Bo loc an sau nut tren mobile, mo ra khi bam
  await page.goto('/collection/smartphones')
  const toggle = page.getByRole('button', { name: /^Filters/ })
  await expect(toggle).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeHidden()
  await toggle.click()
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible()
})

test('mobile: admin sidebar is a drawer that closes after navigating', async ({ page }) => {
  await loginAs(page, 'admin@example.com')
  await page.goto('/admin/orders')
  await page.waitForLoadState('networkidle')
  expect(await overflowX(page)).toBeLessThanOrEqual(0)

  const fraudLink = page.getByRole('link', { name: 'Fraud Flags' })
  await expect(fraudLink).toBeHidden()
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(fraudLink).toBeVisible()
  await fraudLink.click()
  await expect(page).toHaveURL(/\/admin\/fraud$/)
  await expect(fraudLink).toBeHidden()
})

test('mobile: drawer closes on Escape and when tapping the current page', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/orders')
  const open = page.getByRole('button', { name: 'Open menu' })
  const nav = page.locator('#side-nav')
  await open.click()
  await expect(open).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
  await open.click()
  await nav.getByRole('link', { name: 'Orders' }).first().click()
  await expect(nav).toBeHidden()
})

test('mobile: cart and checkout have no horizontal scroll', async ({ page }) => {
  const token = await loginAs(page, 'jane@example.com')
  await clearCart(page, token)
  const p = (await (await page.request.get(`${API}/products?search=Xiaomi 14&limit=1`)).json()).products[0]
  const r = await page.request.post(`${API}/cart/add_item/${p.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { quantity: 1, color: p.available_colors?.[0] ?? null, variant_id: p.variants?.[0]?.id }
  })
  expect(r.ok(), await r.text()).toBeTruthy()
  for (const url of ['/cart', '/checkout']) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    expect(await overflowX(page), url).toBeLessThanOrEqual(0)
  }
  await clearCart(page, token)
})

test('mobile: admin list pages have no horizontal scroll', async ({ page }) => {
  await loginAs(page, 'admin@example.com')
  for (const p of ['shops', 'products', 'customers', 'coupons', 'categories', 'settings']) {
    await page.goto(`/admin/${p}`)
    await page.waitForLoadState('networkidle')
    expect(await overflowX(page), p).toBeLessThanOrEqual(0)
  }
})
