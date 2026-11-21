import { expect, test } from '@playwright/test'
import { API, PASSWORD, loginAs } from './helpers'

// Cong cu seller: xac nhan hang loat + xuat CSV, trang thu nhap, sinh ma tran bien the
test('seller: bulk confirm two pending COD orders and export CSV', async ({ page }) => {
  // Jane dat 2 don COD o Tech World de chac chan co don pending moi nhat
  const login = await page.request.post(`${API}/auth/login`, {
    data: { email: 'jane@example.com', password: PASSWORD }
  })
  const jane = (await login.json()).data.accessToken as string
  // San pham khong bien the con nhieu hang nhat (chay lai nhieu lan khong het kho)
  const list = await page.request.get(`${API}/shops/tech-world/products?limit=50`)
  const product = (await list.json()).products
    .filter((p: { variants?: unknown[] }) => !p.variants?.length)
    .sort((a: { quantity: number }, b: { quantity: number }) => b.quantity - a.quantity)[0]
  for (let i = 0; i < 2; i++) {
    const res = await page.request.post(`${API}/orders`, {
      headers: { Authorization: `Bearer ${jane}`, 'X-Device-Id': 'e2e-seller-tools' },
      data: {
        items: [{ product_id: product.id, quantity: 1, color: product.available_colors?.[0] || null }],
        shipping_address: { name: 'Jane Smith', phone: '0912345678', address: '1 E2E St' },
        payment_method: 'cod'
      }
    })
    expect(res.status()).toBe(201)
  }

  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/orders?status=pending')
  // Don moi nhat dung dau, la 2 don COD vua dat
  const boxes = page.locator('table tbody input[type=checkbox]')
  await boxes.nth(0).check()
  await boxes.nth(1).check()
  await expect(page.getByText('2 selected')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm selected' }).click()
  await expect(page.getByText(/Confirmed 2 order/)).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.csv$/)
})

test('seller: finance page shows income summary', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller')
  await page.getByRole('link', { name: 'My Income' }).click()
  await expect(page.getByRole('heading', { name: 'My Income' })).toBeVisible()
  for (const card of ['Released', 'Pending', 'Platform fee', 'Net income']) {
    await expect(page.getByText(card, { exact: false }).first()).toBeVisible()
  }
})

test('seller: generate variants from two options (not saved)', async ({ page }) => {
  await loginAs(page, 'seller1@example.com')
  await page.goto('/seller/products/new')
  const addOption = page.getByRole('button', { name: '+ Add option' })
  const fillOption = async (i: number, name: string, values: string[]) => {
    await addOption.click()
    await page.getByLabel(`Option ${i} name`).fill(name)
    const input = page.getByLabel(`Option ${i} values`)
    for (const v of values) {
      await input.fill(v)
      await input.press('Enter')
    }
  }
  await fillOption(1, 'Color', ['Black', 'White'])
  await fillOption(2, 'Storage', ['256GB', '512GB'])
  await page.getByRole('button', { name: 'Generate variants' }).click()
  for (const name of ['Black / 256GB', 'Black / 512GB', 'White / 256GB', 'White / 512GB']) {
    await expect(page.locator(`input[value="${name}"]`)).toBeVisible()
  }
  await expect(page.locator('input[value="color=White, storage=512GB"]')).toBeVisible()
})
