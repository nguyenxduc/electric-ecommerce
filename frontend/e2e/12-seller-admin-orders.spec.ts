import { expect, test } from '@playwright/test'
import { API, loginAs } from './helpers'

const SHOTS =
  'C:/Users/Lecoo/AppData/Local/Temp/claude/b442fcb7fe5894f0/cd817156-7e17-4c5c-b817-8bd1dc0f3a07/scratchpad/fix3'

test('seller: search orders by buyer name, empty search message', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/orders')
  const search = page.getByPlaceholder('Search order no., buyer, phone, tracking')
  await search.fill('Jane')
  await expect(page.getByRole('row').filter({ hasText: 'Jane' }).first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/seller-search-jane.png`, fullPage: true })

  await search.fill('zzz-no-such-order')
  await expect(page.getByText('No orders match your search')).toBeVisible()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(search).toHaveValue('')
})

test('seller: orders list fits 390px with cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/orders')
  await expect(page.locator('ul li a[href^="/seller/orders/"]').first()).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: `${SHOTS}/seller-orders-390.png`, fullPage: true })
})

test('seller: order detail has guided actions and cancel needs a reason', async ({ page }) => {
  // Jane dat mot don COD o Tech World de seller xu ly
  const buyerToken = await loginAs(page, 'jane@example.com')
  const products = (await (await page.request.get(`${API}/shops/tech-world/products?limit=20&sort=price-asc`)).json())
    .products as { id: number; variants?: unknown[]; available_colors?: string[] }[]
  const p = products.find(x => !x.variants?.length)!
  const res = await page.request.post(`${API}/orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: {
      items: [{ product_id: p.id, quantity: 1, color: p.available_colors?.[0] || null }],
      shipping_address: { name: 'Jane Smith', phone: '0912345678', address: '1 E2E St', ward: 'Ward 1', district: 'District 1', province: 'Ho Chi Minh' },
      payment_method: 'cod'
    }
  })
  expect(res.status()).toBe(201)
  const orderId = (await res.json()).orders[0].id

  await page.context().clearCookies()
  await loginAs(page, 'seller1@example.com')
  await page.goto(`/seller/orders/${orderId}`)
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeEnabled()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByText('District 1, Ho Chi Minh')).toBeVisible()
  await expect(page.getByText('Subtotal')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/seller-order-detail.png`, fullPage: true })

  await page.getByRole('button', { name: 'Cancel order' }).click()
  const confirm = page.getByRole('button', { name: 'Confirm cancel' })
  await expect(confirm).toBeDisabled()
  await page.getByRole('button', { name: 'Out of stock' }).click()
  await expect(confirm).toBeEnabled()
  await page.screenshot({ path: `${SHOTS}/seller-cancel-modal.png` })
  await confirm.click()
  await expect(page.getByText('Order cancelled')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm order' })).toBeHidden()
})

test('admin: orders tabs and filters', async ({ page }) => {
  await loginAs(page, 'admin@example.com')
  await page.goto('/admin/orders')
  await expect(page.getByRole('button', { name: 'Processing' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Shipped' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Returned' })).toBeVisible()
  await expect(page.getByLabel('Shop')).toContainText('Tech World')
  await page.getByPlaceholder('Search order no., buyer, phone, tracking').fill('Jane')
  await expect(page.getByRole('row').filter({ hasText: 'Jane' }).first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/admin-orders.png`, fullPage: true })
})

test('admin: shop reject needs a reason', async ({ page }) => {
  await loginAs(page, 'admin@example.com')
  await page.goto('/admin/shops?status=pending')
  const row = page.getByRole('row', { name: /New Corner Store/ })
  await row.getByRole('button', { name: 'Reject' }).click()
  const modal = page.locator('div.fixed').filter({ hasText: 'Reject "New Corner Store"' })
  const submit = modal.getByRole('button', { name: 'Reject', exact: true })
  await expect(submit).toBeDisabled()
  await modal.getByRole('button', { name: 'Pickup address incomplete' }).click()
  await expect(submit).toBeEnabled()
  await page.screenshot({ path: `${SHOTS}/admin-reject-modal.png` })
  // Khong tu choi that: e2e 07 can shop nay con pending
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(modal).toBeHidden()
})
