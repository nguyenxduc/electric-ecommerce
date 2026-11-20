import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers'

const SHOTS = process.env.E2E_SHOTS_DIR

const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

test('seller: create form lists categories and blocks empty submit with inline errors', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/products/new')
  const category = page.locator('#pf-category')
  // Truoc day select rong vi /categories/admin tra 403 cho nguoi ban
  await expect.poll(() => category.locator('option').count()).toBeGreaterThan(1)

  await page.getByRole('button', { name: 'Publish Product' }).click()
  await expect(page.getByText('Product name is required')).toBeVisible()
  await expect(page.getByText('Select a category')).toBeVisible()
  await expect(page.getByText('Price must be greater than 0')).toBeVisible()
  await expect(page.getByText('Add at least one image')).toBeVisible()
  await expect(page).toHaveURL(/\/seller\/products\/new$/)
  await shot(page, 'create-errors')
})

test('seller: edit preselects category and renders grouped specs detail', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/products')
  await page.locator('table a[title="Edit"]').first().click()
  await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible()
  await expect(page.locator('#pf-category')).not.toHaveValue('')
  await expect(page.getByText(': undefined')).toHaveCount(0)
  await shot(page, 'edit')
})

test('seller: toggle a product hidden then live', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/products')
  const sw = page.locator('table').getByRole('switch').first()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('tab', { name: 'Hidden' }).click()
  await expect(page.locator('table').getByRole('switch').first()).toHaveAttribute('aria-checked', 'false')
  await page.locator('table').getByRole('switch').first().click()
  await expect(page.getByText('Product is live')).toBeVisible()
  await page.getByRole('tab', { name: 'All' }).click()
  await expect(page.locator('table').getByRole('switch').first()).toHaveAttribute('aria-checked', 'true')
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('seller: product list has no horizontal scroll at 390px', async ({ page }) => {
    await loginAs(page, 'seller1@example.com')
    await page.goto('/seller/products')
    await expect(page.getByTestId('product-cards')).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ).toBeLessThanOrEqual(0)
    // Nut Edit/Delete cua the dau tien nam trong man hinh
    const edit = page.getByTestId('product-cards').getByRole('link', { name: 'Edit' }).first()
    await expect(edit).toBeInViewport()
    await shot(page, 'list-390')
    await page.goto('/seller/products/new')
    await page.waitForLoadState('networkidle')
    await shot(page, 'create-390')
  })
})
