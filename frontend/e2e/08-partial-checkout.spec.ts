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

const fillCart = async (page: import('@playwright/test').Page, token: string, queries: string[]) => {
  const headers = { Authorization: `Bearer ${token}` }
  await clearCart(page, token)
  const ids: number[] = []
  for (const q of queries) {
    const p = (await (await page.request.get(`${API}/products?search=${q}&limit=1`)).json()).products[0]
    const r = await page.request.post(`${API}/cart/add_item/${p.id}`, {
      headers,
      data: { quantity: 1, color: p.available_colors?.[0] ?? null, variant_id: p.variants?.[0]?.id }
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    ids.push(p.id)
  }
  return ids
}

// Bo chon het roi vao thang /checkout: khong duoc tu dat ca gio
test('buyer: nothing selected means nothing to check out', async ({ page }) => {
  const token = await loginAs(page, 'john@example.com')
  await fillCart(page, token, ['MacBook'])
  await page.goto('/cart')
  await page.getByRole('checkbox', { name: 'Select all items' }).uncheck()
  await expect(page.getByRole('button', { name: /Proceed to checkout/ })).toBeDisabled()
  await page.goto('/checkout')
  await expect(page.getByText('No items selected for checkout')).toBeVisible()
  await clearCart(page, token)
})

// Mua ngay chi thanh toan dung san pham vua bam, du gio con mon khac
test('buyer: buy now checks out only that product', async ({ page }) => {
  const token = await loginAs(page, 'john@example.com')
  const [, watchId] = await fillCart(page, token, ['MacBook', 'Watch'])
  // Bo chon Watch o gio truoc, mua ngay van phai chon lai no
  await page.goto('/cart')
  await page.getByRole('checkbox', { name: /^Select Apple Watch/ }).uncheck()
  await page.goto(`/product/apple-watch-series-9-p${watchId}`)
  await page.getByRole('button', { name: 'Buy Now' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByText('Apple Watch Series 9')).toBeVisible()
  await expect(page.getByText('MacBook Pro 16')).toBeHidden()
  await clearCart(page, token)
})
