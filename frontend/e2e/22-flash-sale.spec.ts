import { test, expect } from '@playwright/test'
import { API, PASSWORD } from './helpers'

// Seller dat flash sale cho 1 san pham -> trang chu co dai Flash Sale (dem nguoc),
// trang chi tiet co banner; xoa flash o cuoi de khong anh huong spec khac.
test('flash sale strip on home and banner on product detail', async ({ page }) => {
  const login = await page.request.post(`${API}/auth/login`, {
    data: { email: 'seller1@example.com', password: PASSWORD }
  })
  const token = (await login.json()).data.accessToken as string
  const headers = { Authorization: `Bearer ${token}` }
  const list = await page.request.get(`${API}/shops/tech-world/products?limit=20`)
  const p = ((await list.json()).products as { id: number; price: number; variants?: unknown[] }[]).find(
    x => !x.variants?.length
  )!
  const hour = 3600 * 1000
  const set = await page.request.patch(`${API}/products/${p.id}`, {
    headers,
    data: {
      flash_discount: Math.round(Number(p.price) / 4),
      flash_starts_at: new Date(Date.now() - hour).toISOString(),
      flash_ends_at: new Date(Date.now() + 2 * hour).toISOString()
    }
  })
  expect(set.ok()).toBeTruthy()

  try {
    await page.goto('/')
    const strip = page.getByTestId('flash-sale-strip')
    await expect(strip).toBeVisible()
    await expect(strip.getByTestId('flash-countdown')).toHaveText(/^\d{2}:\d{2}:\d{2}$/)
    const card = strip.locator(`li:has-text("Flash")`).first()
    await expect(card).toBeVisible()
    await expect(card.locator('.line-through')).toBeVisible()

    await page.goto(`/product/x-p${p.id}`)
    const banner = page.getByTestId('flash-banner')
    await expect(banner).toBeVisible()
    await expect(banner.getByTestId('flash-countdown')).toHaveText(/\d{2}:\d{2}:\d{2}/)
  } finally {
    await page.request.patch(`${API}/products/${p.id}`, { headers, data: { flash_discount: '' } })
  }
})
