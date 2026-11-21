import { expect, test, type Page } from '@playwright/test'
import { API, loginAs } from './helpers'

// Voucher kieu Shopee: nguoi mua luu voucher shop tu trang san pham roi thay
// trong kho voucher; seller tam dung va bat lai voucher cua shop.

// URL san pham dang "<ten>-p<id>"; trang chi doc phan id
const firstTechWorldProductPath = async (page: Page) => {
  const res = await page.request.get(`${API}/shops/tech-world/products?limit=1`)
  const p = (await res.json()).products[0] as { id: number }
  return `/product/item-p${p.id}`
}

test('buyer: collect TECHWORLD10 on a Tech World product, see it in the warehouse', async ({ page }) => {
  const token = await loginAs(page, 'jane@example.com')
  const auth = { Authorization: `Bearer ${token}` }
  const shopVouchers = await page.request.get(`${API}/coupons/shop/tech-world`, { headers: auth })
  const tw = ((await shopVouchers.json()).data.coupons as { id: number; code: string }[]).find(
    c => c.code === 'TECHWORLD10'
  )
  expect(tw, 'seed co TECHWORLD10').toBeTruthy()
  // Bat dau tu trang thai chua luu, va don dep sau test
  const unclaim = () => page.request.delete(`${API}/coupons/${tw!.id}/claim`, { headers: auth })
  await unclaim()

  await page.goto(await firstTechWorldProductPath(page))
  const card = page.getByTestId('shop-voucher-TECHWORLD10')
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Collect' }).click()
  await expect(card.getByText('Collected')).toBeVisible()

  await page.goto('/profile')
  await page.getByRole('button', { name: 'Voucher warehouse' }).first().click()
  const row = page.getByTestId('warehouse-voucher-TECHWORLD10')
  await expect(row).toBeVisible()
  await expect(row).toContainText('Tech World')
  await expect(row).toContainText('Usable')
  await unclaim()
})

test('seller: pause then resume a shop voucher', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/coupons')
  const row = page.getByTestId('seller-coupon-TECHWORLD10')
  await expect(row).toBeVisible()
  await expect(row).toContainText('Active')

  await row.getByRole('button', { name: 'Pause TECHWORLD10' }).click()
  await expect(row).toContainText('Paused')
  await row.getByRole('button', { name: 'Resume TECHWORLD10' }).click()
  await expect(row).toContainText('Active')
})
