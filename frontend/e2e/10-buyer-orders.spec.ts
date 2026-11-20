import { expect, test } from '@playwright/test'
import { API, loginAs } from './helpers'

// Nguoi mua: tab don kieu app san, don da giao co Buy again/Write review,
// huy don COD qua modal co ly do.
test('buyer: order tabs, delivered actions and cancel with reason', async ({ page }) => {
  const token = await loginAs(page, 'jane@example.com')
  const headers = { Authorization: `Bearer ${token}`, 'X-Device-Id': 'e2e-buyer-orders' }

  // Tao mot don COD moi de huy
  const p = (await (await page.request.get(`${API}/products?limit=1`)).json()).products[0]
  const created = await page.request.post(`${API}/orders`, {
    headers,
    data: {
      items: [{ product_id: p.id, quantity: 1, color: p.available_colors?.[0] || null }],
      shipping_address: { name: 'Jane', phone: '0912345678', address: 'Demo St' },
      payment_method: 'cod'
    }
  })
  expect(created.status()).toBe(201)
  const orderNumber = (await created.json()).orders[0].order_number as string

  // Invoice khong duoc goi rieng nua (di kem danh sach don)
  const invoiceCalls: string[] = []
  page.on('request', r => r.url().includes('/invoices/orders/') && invoiceCalls.push(r.url()))

  await page.goto('/profile?tab=orders')
  const tabs = page.getByRole('tablist')
  for (const name of ['To pay', 'To ship', 'To receive', 'Completed', 'Cancelled', 'Return/Refund']) {
    await expect(tabs.getByRole('tab', { name: new RegExp(`^${name.replace('/', '\\/')}`) })).toBeVisible()
  }

  // Don da giao: Buy again + Write review tren the va trong chi tiet
  await tabs.getByRole('tab', { name: /^Completed/ }).click()
  const card = page.locator('div.rounded-xl').filter({ hasText: 'Completed' }).first()
  await expect(card.getByRole('button', { name: 'Buy again' })).toBeVisible()
  await expect(card.getByRole('link', { name: 'Write review' })).toHaveAttribute('href', /\/product\/.+#reviews$/)
  await card.getByRole('button', { name: /View details/ }).click()
  await expect(page.getByRole('button', { name: 'Buy again' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Write review' }).first()).toBeVisible()
  await page.getByRole('button', { name: /Back to orders/ }).click()

  // Huy don COD vua tao qua modal
  await tabs.getByRole('tab', { name: /^To ship/ }).click()
  const mine = page.locator('div.rounded-xl').filter({ hasText: orderNumber })
  await mine.getByRole('button', { name: /View details/ }).click()
  await page.getByRole('button', { name: 'Cancel Order' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('nothing to refund')
  const reason = dialog.getByLabel('Reason')
  await expect(reason.locator('option')).toHaveText([
    'Changed my mind',
    'Found a better price',
    'Wrong address or details',
    'Ordered by mistake',
    'Other'
  ])
  await reason.selectOption('Ordered by mistake')
  await dialog.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByText('Order cancelled')).toBeVisible()
  await tabs.getByRole('tab', { name: /^Cancelled/ }).click()
  await expect(page.locator('div.rounded-xl').filter({ hasText: orderNumber })).toBeVisible()

  expect(invoiceCalls).toEqual([])
})

// Mobile 390px: tab don va menu profile cuon ngang, trang khong tran ngang
test('buyer: orders tab fits a 390px screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAs(page, 'jane@example.com')
  await page.goto('/profile?tab=orders')
  await expect(page.getByRole('tablist')).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(390)
})
