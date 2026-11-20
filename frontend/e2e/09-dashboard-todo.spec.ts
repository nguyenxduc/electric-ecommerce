import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

// Seller: khoi To-do -> danh sach don cho xac nhan -> Confirm ngay tren dong
test('seller: to-do opens pending orders and confirms one in place', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller')
  const toConfirm = page.getByRole('link', { name: /To confirm/ })
  await expect(toConfirm).toBeVisible()
  await toConfirm.click()
  await expect(page).toHaveURL(/\/seller\/orders\?status=pending/)
  await expect(page.getByRole('button', { name: 'Pending' })).toHaveClass(/bg-blue/)

  const row = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Confirm' }) }).first()
  const orderLink = await row.getByRole('link').first().textContent()
  await row.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Order confirmed - ready to ship')).toBeVisible()
  // Don vua xac nhan roi khoi tab Pending
  await expect(page.getByRole('link', { name: orderLink!, exact: true })).toBeHidden()
})

// Admin: To-do dan thang toi danh sach shop cho duyet
test('admin: to-do links to pending shop applications', async ({ page }) => {
  await loginAs(page, 'admin@example.com')
  await page.goto('/admin')
  await page.getByRole('link', { name: /Shop applications/ }).click()
  await expect(page).toHaveURL(/\/admin\/shops\?status=pending/)
  await expect(page.getByRole('row', { name: /New Corner Store/ })).toBeVisible()
})

// O "Low stock" mo danh sach san pham da loc ?stock=low
test('seller: low stock tile opens the filtered product list', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller')
  await page.getByRole('link', { name: /Low stock/ }).click()
  await expect(page).toHaveURL(/\/seller\/products\?stock=low/)
  await expect(page.getByRole('button', { name: 'Low stock only' })).toHaveAttribute('aria-pressed', 'true')
})
