import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

// Seller tra loi danh gia o /seller/reviews, nguoi mua thay "Response from <shop>" tren trang san pham
test('seller replies to a review and the buyer sees it on the product page', async ({ page, browser }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller')
  await page.getByRole('link', { name: 'Reviews', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Product Reviews' })).toBeVisible()

  // Danh gia moi nhat; chay lai lan sau thi no da co tra loi -> sua lai
  const card = page.getByTestId('seller-review').first()
  await expect(card).toBeVisible()
  const editBtn = card.getByRole('button', { name: 'Edit reply' })
  if (await editBtn.isVisible()) await editBtn.click()
  const text = `Thanks for your feedback! (e2e ${Date.now()})`
  await card.getByRole('textbox', { name: 'Reply' }).fill(text)
  await card.getByRole('button', { name: /^(Reply|Save reply)$/ }).click()
  await expect(page.getByText('Reply posted')).toBeVisible()
  await expect(card.getByText(text)).toBeVisible()
  const href = await card.getByRole('link').first().getAttribute('href')
  expect(href).toMatch(/#reviews$/)

  const ctx = await browser.newContext()
  const buyer = await ctx.newPage()
  await loginAs(buyer, 'jane@example.com')
  await buyer.goto(href!)
  await expect(buyer.getByText(text)).toBeVisible()
  await expect(buyer.getByText(/Response from Tech World/).first()).toBeVisible()
  await ctx.close()
})
