import { expect, test } from '@playwright/test'
import { API, clearCart, loginAs } from './helpers'

// Bo chon mot dong o gio -> checkout chi dat dong con lai, dong bo chon van nam trong gio
test('buyer: checkout only the selected cart items', async ({ page }) => {
  const token = await loginAs(page, 'john@example.com')
  const headers = { Authorization: `Bearer ${token}` }
  await clearCart(page, token)
  for (const q of ['MacBook', 'Watch']) {
    const p = (await (await page.request.get(`${API}/products?search=${q}&limit=1`)).json()).products[0]
    const r = await page.request.post(`${API}/cart/add_item/${p.id}`, {
      headers,
      data: { quantity: 1, color: p.available_colors?.[0] ?? null, variant_id: p.variants?.[0]?.id }
    })
    expect(r.ok(), await r.text()).toBeTruthy()
  }

  await page.goto('/cart')
  await page.getByRole('checkbox', { name: /^Select Apple Watch/ }).uncheck()
  await expect(page.getByText('Unselected items stay in your cart.')).toBeVisible()
  await page.getByRole('button', { name: 'Proceed to checkout (1)' }).click()

  await expect(page.getByText('MacBook Pro 16')).toBeVisible()
  await expect(page.getByText('Apple Watch Series 9')).toBeHidden()
  await page.getByPlaceholder('Province / City').fill('Ho Chi Minh')
  await page.getByPlaceholder('District', { exact: true }).fill('Quan 1')
  await page.getByPlaceholder('Ward', { exact: true }).fill('Ben Nghe')
  await page.getByPlaceholder('Street, city, district...').fill('1 Le Loi')
  await page.getByRole('button', { name: 'Place order (COD)' }).click()
  await expect(page).toHaveURL(/payment-result\?method=cod/)

  // Chi con dong da bo chon trong gio
  await expect
    .poll(async () => {
      const cart = (await (await page.request.get(`${API}/cart`, { headers })).json()).cart
      return cart.items.map((i: { name: string }) => i.name)
    })
    .toEqual(['Apple Watch Series 9'])
  await clearCart(page, token)
})
