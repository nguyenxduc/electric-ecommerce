import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

// Di qua wizard dang ky ban hang, khong nop de giu nguyen du lieu seed
test('buyer: seller registration wizard validates each step', async ({ page }) => {
  await loginAs(page, 'jane@example.com')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sell on Marketplace' }).click()
  await page.getByRole('button', { name: 'Register now' }).click()

  // Buoc 1: thieu ten shop thi khong qua buoc
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Shop name is required')).toBeVisible()
  await page.getByPlaceholder('e.g. Tech Corner').fill('Jane Gadgets')
  await page.getByPlaceholder('0912345678').fill('0912345678')
  await page.getByRole('button', { name: 'Next' }).click()

  // Buoc 2: dia chi lay hang
  await expect(page.getByRole('heading', { name: 'Pickup address' })).toBeVisible()
  await page.getByPlaceholder('Ha Noi').fill('Ha Noi')
  await page.getByPlaceholder('Hoan Kiem').fill('Hoan Kiem')
  await page.getByPlaceholder('Trang Tien').fill('Trang Tien')
  await page.getByPlaceholder('House number, street name').fill('1 Trang Tien')
  await page.getByRole('button', { name: 'Next' }).click()

  // Buoc 3: doanh nghiep bat buoc MST
  await page.getByRole('radio', { name: /Company/ }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Companies must provide a tax code')).toBeVisible()
  await page.getByPlaceholder('0101234567').fill('0101234567')
  await page.getByRole('button', { name: 'Next' }).click()

  // Buoc 4: tong hop + phai dong y dieu khoan moi nop duoc
  await expect(page.getByText('1 Trang Tien, Trang Tien, Hoan Kiem, Ha Noi')).toBeVisible()
  const submit = page.getByRole('button', { name: 'Submit application' })
  await expect(submit).toBeDisabled()
  await page.getByRole('checkbox').check()
  await expect(submit).toBeEnabled()
})

// Admin xem du ho so dang ky truoc khi duyet
test('admin: review a pending shop application', async ({ page }) => {
  await loginAs(page, 'admin@example.com')
  await page.goto('/admin/shops')
  const row = page.getByRole('row', { name: /New Corner Store/ })
  await row.getByRole('button', { name: 'Review' }).click()
  const dialog = page.getByRole('dialog', { name: 'Application of New Corner Store' })
  await expect(dialog.getByText('Pickup address')).toBeVisible()
  await expect(dialog.getByText('Business type')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Approve' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
})
