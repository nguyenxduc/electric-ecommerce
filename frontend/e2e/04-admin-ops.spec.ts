import { expect, test } from '@playwright/test'
import { loadState, loginAs } from './helpers'

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'admin@example.com')
})

test('admin: COD settlement shows difference', async ({ page }) => {
  const { orderNumber } = loadState()
  expect(orderNumber, 'run 01 first').toBeTruthy()
  await page.goto('/admin/cod')
  const row = page.getByRole('row').filter({ hasText: orderNumber })
  await expect(row).toBeVisible()
  await row.getByRole('checkbox').check()
  const expected = Number((await row.getByRole('cell').nth(4).textContent())!.replace(/[^\d]/g, ''))
  expect(expected).toBeGreaterThan(0)
  // Nhap thieu 1000 VND de co chenh lech
  await page.getByPlaceholder('Received amount (VND)').fill(String(expected - 1000))
  await page.getByPlaceholder('Reference').fill('E2E-REF')
  await page.getByRole('button', { name: 'Record settlement' }).click()
  const result = page.getByText(/Settlement #\d+: expected/)
  await expect(result).toBeVisible()
  await expect(result).toContainText('difference')
  // Don da quyet toan nen khong con trong danh sach cho
  await expect(page.getByRole('row').filter({ hasText: orderNumber })).toBeHidden()
})

test('admin: fraud stats load', async ({ page }) => {
  await page.goto('/admin/fraud')
  await expect(page.getByRole('heading', { name: 'Fraud Flags' })).toBeVisible()
  await expect(page.getByText('COUPON_ABUSE').first()).toBeVisible()
  await expect(page.getByText('Total', { exact: true })).toBeVisible()
})

test('admin: tax report + CSV download', async ({ page }) => {
  await page.goto('/admin/tax')
  await expect(page.getByRole('heading', { name: /Tax/ })).toBeVisible()
  await expect(page.locator('input[type="month"]')).toHaveValue(new Date().toISOString().slice(0, 7))
  await expect(page.getByRole('row').filter({ hasText: 'Tech World' }).first()).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download CSV' }).click()
  expect((await dl).suggestedFilename()).toMatch(/\.csv$/)
})

test('admin: shop tax modal opens', async ({ page }) => {
  await page.goto('/admin/shops')
  await page.getByRole('button', { name: 'Tax', exact: true }).first().click()
  await expect(page.getByText(/Tax info - "/)).toBeVisible()
  await expect(page.getByPlaceholder(/Tax code/)).toBeVisible()
})
