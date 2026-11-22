import { test, expect } from '@playwright/test'
import { API } from './helpers'

// Xem 2 san pham -> trang chu co dai "Recently viewed", san pham xem sau dung truoc; Clear xoa dai.
test('recently viewed strip on home, most recent first', async ({ page }) => {
  const list = await page.request.get(`${API}/shops/tech-world/products?limit=5`)
  const [p1, p2] = (await list.json()).products as { id: number; name: string }[]

  await page.goto(`/product/x-p${p1.id}`)
  await expect(page.getByRole('heading', { name: p1.name }).first()).toBeVisible()
  await page.goto(`/product/x-p${p2.id}`)
  await expect(page.getByRole('heading', { name: p2.name }).first()).toBeVisible()
  // dai o trang chi tiet co san pham xem truoc
  await expect(page.getByTestId('recently-viewed').getByText(p1.name).first()).toBeVisible()

  await page.goto('/')
  const strip = page.getByTestId('recently-viewed')
  await expect(strip).toBeVisible()
  const items = strip.locator('li')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText(p2.name)
  await expect(items.nth(1)).toContainText(p1.name)

  await strip.getByRole('button', { name: 'Clear' }).click()
  await expect(strip).toHaveCount(0)
})
