import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { API, loginAs } from './helpers'

// Buyer hoi tren trang san pham -> shop tra loi o Seller Center -> buyer thay cau tra loi.
let product: { id: number; name: string }

const reset = () =>
  execFileSync('node', [path.join('e2e', 'reset-questions.mjs'), String(product.id)], {
    cwd: process.cwd(),
    env: process.env
  })
const slugOf = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

test.beforeAll(async ({ request }) => {
  const list = await (await request.get(`${API}/shops/tech-world/products?limit=1&sort=price-asc`)).json()
  product = list.products[0]
  reset()
})
test.afterAll(() => reset())

test('buyer asks, seller answers, buyer sees the answer', async ({ page, browser }) => {
  const url = `/product/${slugOf(product.name)}-p${product.id}#questions`
  await loginAs(page, 'jane@example.com')
  await page.goto(url)
  const ask = page.getByRole('button', { name: 'Ask question' })
  await expect(ask).toBeDisabled()
  await page.getByLabel('Your question').fill('Is the warranty 12 months?')
  await ask.click()
  await expect(page.getByText('Question sent. The shop will be notified.')).toBeVisible()
  await expect(page.getByTestId('question-item').filter({ hasText: 'Is the warranty 12 months?' })).toContainText(
    'Waiting for the shop to answer'
  )

  const sellerPage = await (await browser.newContext()).newPage()
  await loginAs(sellerPage, 'seller1@example.com')
  await sellerPage.goto('/seller/questions?filter=unanswered')
  const card = sellerPage.getByTestId('seller-question').filter({ hasText: 'Is the warranty 12 months?' })
  await card.getByLabel('Answer', { exact: true }).fill('Yes, 12 months official warranty.')
  await card.getByRole('button', { name: 'Answer', exact: true }).click()
  await expect(sellerPage.getByText('Answer posted')).toBeVisible()
  await expect(sellerPage.getByText('All questions have been answered.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Yes, 12 months official warranty.')).toBeVisible()
})

test('owner sees the Seller Center link instead of the ask box and no Report button', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto(`/product/${slugOf(product.name)}-p${product.id}#questions`)
  await expect(page.getByRole('link', { name: 'Answer them in Seller Center' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Report this product' })).toHaveCount(0)
})
