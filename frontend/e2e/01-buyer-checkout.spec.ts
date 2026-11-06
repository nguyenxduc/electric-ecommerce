import { expect, test } from '@playwright/test'
import { API, PASSWORD, clearCart, saveState } from './helpers'

test('buyer: variant, cart, checkout COD with shipping quote', async ({ page }) => {
  // Don gio hang cu qua API de test lap lai duoc
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'jane@example.com', password: PASSWORD }
  })
  await clearCart(page, (await res.json()).data.accessToken)

  // Login qua modal
  await page.goto('/')
  await page.getByRole('button', { name: 'Login / Sign Up' }).click()
  await page.getByPlaceholder('E-mail', { exact: true }).fill('jane@example.com')
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page.getByRole('button', { name: 'Login / Sign Up' })).toBeHidden()

  // Chi tiet san pham co variant
  await page.goto('/product/xiaomi-14-p1763')
  await expect(page.getByRole('heading', { name: 'Xiaomi 14', level: 1 })).toBeVisible()
  const addBtn = page.getByRole('button', { name: 'Add to Cart' })
  await expect(addBtn).toBeDisabled()

  const basePrice = 739.99
  await page.getByRole('button', { name: '512GB', exact: true }).click()
  await expect(addBtn).toBeEnabled()
  // price_delta = 80
  await expect(page.getByRole('heading', { name: `$${(basePrice + 80).toFixed(2)}` })).toBeVisible()

  await addBtn.click()
  await expect(page.getByText('Added to cart successfully')).toBeVisible()

  // Gio hang hien ten variant
  await page.goto('/cart')
  await expect(page.getByText('512GB', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Proceed to checkout' }).click()
  await expect(page).toHaveURL(/\/checkout/)

  // Dia chi co cau truc
  const quote = page.waitForResponse(r => r.url().includes('/shipping/quote') && r.ok())
  await page.getByPlaceholder('Full name').fill('Jane Smith')
  await page.getByPlaceholder('Phone number').fill('0987654321')
  await page.getByPlaceholder('Province / City').fill('Ho Chi Minh')
  await page.getByPlaceholder('District', { exact: true }).fill('Quan 1')
  await page.getByPlaceholder('Ward', { exact: true }).fill('Ben Nghe')
  await page.getByPlaceholder('Street, city, district...').fill('1 Le Loi')

  // Bao gia van chuyen tu server -> dong Shipping (shop) co gia tri
  await quote
  const shipRow = page.getByText(/Shipping \(Tech World\)/)
  await expect(shipRow).toBeVisible()
  await expect(shipRow.locator('xpath=following-sibling::span')).toHaveText(/\$\d|Free/)

  await page.getByRole('button', { name: 'Place order (COD)' }).click()
  await expect(page).toHaveURL(/payment-result\?method=cod/)
  await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
  await expect(page.getByText('Your order will be paid when it is delivered (COD).')).toBeVisible()

  const url = new URL(page.url())
  const orders = (url.searchParams.get('orders') || '').split(',')
  expect(orders[0]).toBeTruthy()
  saveState({ orderNumber: orders[0], groupNumber: url.searchParams.get('order') })
})
