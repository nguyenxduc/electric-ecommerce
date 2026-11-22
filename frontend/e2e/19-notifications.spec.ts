import { expect, test } from '@playwright/test'
import { API, loginAs } from './helpers'

// Chuong thong bao: dat don COD qua API, bam thong bao don hang -> mo dung chi tiet don,
// roi danh dau tat ca da doc.
test('buyer: order notification deep-links to the order and mark all as read', async ({ page }) => {
  const token = await loginAs(page, 'jane@example.com')
  const headers = { Authorization: `Bearer ${token}`, 'X-Device-Id': 'e2e-notifications' }

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

  await page.goto('/')
  await page.getByRole('button', { name: 'Notifications' }).click()
  await page.getByRole('tab', { name: /^Orders/ }).click()
  await page.getByTestId('notification-item').filter({ hasText: orderNumber }).first().click()

  await expect(page).toHaveURL(/\/profile\?tab=orders/)
  await expect(page.getByRole('button', { name: /Back to orders/ })).toBeVisible()
  await expect(page.getByText(orderNumber).first()).toBeVisible()

  await page.getByRole('button', { name: 'Notifications' }).click()
  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeHidden()
  await expect(page.getByText(/\d+ new/)).toBeHidden()
})
