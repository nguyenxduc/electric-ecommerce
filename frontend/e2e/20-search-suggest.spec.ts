import { test, expect } from '@playwright/test'

// O tim kiem: go "lap" -> goi y -> bam vao thi sang trang san pham; tim xong thi hien o "Recent searches"
test('search box suggests products and remembers recent searches', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Open search').click()
  const input = page.getByRole('combobox')
  await input.fill('lap')
  const option = page.getByRole('option').filter({ hasText: /ASUS ROG/i }).first()
  await expect(option).toBeVisible()
  await option.click()
  await expect(page).toHaveURL(/\/product\/.*-p\d+/)

  await page.goto('/')
  await page.getByLabel('Open search').click()
  await page.getByRole('combobox').fill('xiaomi')
  await page.getByRole('combobox').press('Enter')
  await expect(page).toHaveURL(/search=xiaomi/)

  await page.getByLabel('Open search').click()
  await expect(page.getByText('Recent searches')).toBeVisible()
  await expect(page.getByRole('option', { name: 'xiaomi' })).toBeVisible()
})
