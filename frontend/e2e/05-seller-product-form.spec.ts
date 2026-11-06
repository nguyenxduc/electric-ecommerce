import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

test('seller: product edit shows variants editor and weight', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/products/1763')
  await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible()
  await expect(page.getByText('Variants (SKU)')).toBeVisible()
  await expect(page.locator('input[value="XIAOMI14-512"]')).toBeVisible()
  const weight = page.getByText('Weight (grams, for shipping)').locator('xpath=following-sibling::input')
  await expect(weight).toBeVisible()
  await expect(weight).not.toHaveValue('')
})
