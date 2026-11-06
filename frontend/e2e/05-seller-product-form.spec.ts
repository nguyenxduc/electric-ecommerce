import { expect, test } from '@playwright/test'
import { API, loginAs } from './helpers'

test('seller: product edit shows variants editor and weight', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  // id doi sau moi lan seed: tra id qua API.
  const found = await page.request.get(`${API}/products?search=Xiaomi%2014&limit=5`)
  const xiaomi = (await found.json()).products.find((p: { name: string }) => p.name === 'Xiaomi 14')
  await page.goto(`/seller/products/${xiaomi.id}`)
  await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible()
  await expect(page.getByText('Variants (SKU)')).toBeVisible()
  await expect(page.locator('input[value="XIAOMI14-512"]')).toBeVisible()
  const weight = page.getByText('Weight (grams, for shipping)').locator('xpath=following-sibling::input')
  await expect(weight).toBeVisible()
  await expect(weight).not.toHaveValue('')
})
