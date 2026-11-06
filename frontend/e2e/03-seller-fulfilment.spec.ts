import { expect, test } from '@playwright/test'
import { loadState, loginAs } from './helpers'

test('seller: shipment, label, simulate delivered, invoice', async ({ page, context }) => {
  const { orderNumber } = loadState()
  expect(orderNumber, 'run 01 first').toBeTruthy()
  await loginAs(page, 'seller1@example.com')

  await page.goto('/seller/orders')
  const search = page.getByPlaceholder('Search by order number')
  await search.fill(orderNumber)
  await search.press('Enter')
  await page.getByRole('link', { name: `#${orderNumber}` }).first().click()
  await expect(page).toHaveURL(/\/seller\/orders\/\d+/)

  await page.getByRole('button', { name: 'Create shipment' }).click()
  await expect(page.getByRole('button', { name: 'Print label' })).toBeVisible()
  const tracking = (
    await page.getByText('Tracking', { exact: true }).locator('xpath=..').textContent()
  )!
    .replace('Tracking', '')
    .trim()
  expect(tracking.length).toBeGreaterThan(3)
  expect(tracking).not.toBe('—')

  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Print label' }).click()
  const label = await popupPromise
  await label.waitForLoadState()
  await expect(label.locator('body')).toContainText(tracking)
  await label.close()

  const sim = page.getByRole('combobox').filter({ hasText: 'Simulate...' })
  await sim.selectOption('in_transit')
  await expect(page.locator('span.capitalize', { hasText: 'in transit' }).first()).toBeVisible()
  await sim.selectOption('delivered')
  await expect(page.locator('span.capitalize', { hasText: /^delivered$/ }).first()).toBeVisible()

  // Don chuyen delivered va hoa don xuat hien
  await page.reload()
  await expect(page.getByText(/^Invoice /)).toBeVisible()
  const invPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'View invoice' }).click()
  const inv = await invPromise
  await inv.waitForLoadState()
  await expect(inv.locator('body')).toContainText('HOA DON')
  await inv.close()
})
