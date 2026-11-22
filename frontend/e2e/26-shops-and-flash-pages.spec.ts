import { expect, test } from '@playwright/test'

// Trang danh ba shop (/shops) va trang Flash Sale rieng (/flash-sale) tu menu tren cung
test('shops directory lists shops and filters by name', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Shops', exact: true }).first().click()
  await expect(page).toHaveURL(/\/shops$/)
  await expect(page.getByRole('heading', { name: 'Shops', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /Tech World/ })).toBeVisible()

  await page.getByLabel('Search shops').fill('gadget')
  await page.getByLabel('Search shops').press('Enter')
  await expect(page).toHaveURL(/q=gadget/)
  await expect(page.getByRole('link', { name: /Gadget Hub/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Tech World/ })).toHaveCount(0)
})

test('flash sale page shows the heading and either deals or an empty state', async ({ page }) => {
  await page.goto('/flash-sale')
  await expect(page.getByRole('heading', { name: 'Flash sale', level: 1 })).toBeVisible()
  const deals = page.locator('ul li a[href^="/product/"]')
  const empty = page.getByText('No flash deals running right now')
  await expect(deals.first().or(empty)).toBeVisible()
})
