import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { API, loginAs } from './helpers'

// Buyer bao cao san pham -> admin thay trong hang doi "Product Reports" va bo qua.
let product: { id: number; name: string; slug?: string }

const reset = () =>
  execFileSync('node', [path.join('e2e', 'reset-reports.mjs'), String(product.id)], {
    cwd: process.cwd(),
    env: process.env
  })

test.beforeAll(async ({ request }) => {
  const list = await (await request.get(`${API}/shops/gadget-hub/products?limit=1&sort=price-asc`)).json()
  product = list.products[0]
  reset()
})
test.afterAll(() => reset())

test('buyer reports a product, admin sees it and dismisses', async ({ page, browser }) => {
  const slugName = product.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  await loginAs(page, 'jane@example.com')
  await page.goto(`/product/${slugName}-p${product.id}`)
  await page.getByRole('button', { name: 'Report this product' }).click()
  const submit = page.getByRole('button', { name: 'Submit report' })
  await expect(submit).toBeDisabled()
  await page.getByLabel('Counterfeit / fake product').check()
  await page.getByLabel('Details').fill('Logo looks fake')
  await submit.click()
  await expect(page.getByText('Thanks, we will review your report')).toBeVisible()

  // Bao cao lan hai -> 409 hien toast
  await page.getByRole('button', { name: 'Report this product' }).click()
  await page.getByLabel('Offensive content').check()
  await page.getByRole('button', { name: 'Submit report' }).click()
  await expect(page.getByText('You already reported this product')).toBeVisible()

  const adminPage = await (await browser.newContext()).newPage()
  await loginAs(adminPage, 'admin@example.com')
  await adminPage.goto('/admin/reports')
  const row = adminPage.getByRole('row').filter({ hasText: product.name })
  await expect(row.getByText('Counterfeit: 1')).toBeVisible()
  await expect(row.getByText('Logo looks fake')).toBeVisible()
  await row.getByRole('button', { name: 'Dismiss' }).click()
  await expect(row).toHaveCount(0)
  await adminPage.getByRole('button', { name: 'dismissed' }).click()
  await expect(adminPage.getByRole('row').filter({ hasText: product.name })).toBeVisible()
})
