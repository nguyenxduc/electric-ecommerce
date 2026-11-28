import { expect, test, type APIRequestContext } from '@playwright/test'
import { API, PASSWORD, loginAs } from './helpers'

// Kiem duyet cua admin: go / khoi phuc san pham va khoa / mo khoa tai khoan.
// afterAll luon tra lai trang thai seed du test giua chung that bai.
const BUYER = 'john@example.com'
let adminToken = ''
let product: { id: number; name: string }
let buyerId = 0

const auth = () => ({ Authorization: `Bearer ${adminToken}` })

const adminToken$ = async (request: APIRequestContext) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@example.com', password: PASSWORD }
  })
  return (await res.json()).data.accessToken as string
}

test.beforeAll(async ({ request }) => {
  adminToken = await adminToken$(request)
  // San pham dat nhat cua Gadget Hub: it bi spec khac dung toi
  const list = await (await request.get(`${API}/shops/gadget-hub/products?limit=1&sort=price-desc`)).json()
  product = list.products[0]
  const users = await (
    await request.get(`${API}/customers?q=${encodeURIComponent(BUYER)}`, { headers: auth() })
  ).json()
  buyerId = users.users.find((u: { email: string }) => u.email === BUYER).id
})

test.afterAll(async ({ request }) => {
  await request.patch(`${API}/products/${product.id}/restore`, { headers: auth() })
  await request.patch(`${API}/customers/${buyerId}/unsuspend`, { headers: auth() })
})

test('admin takes down then restores a product with a reason', async ({ page }) => {
  await loginAs(page, 'admin@example.com')
  await page.goto(`/admin/products?q=${encodeURIComponent(product.name)}`)
  const row = page.getByRole('row').filter({ hasText: product.name }).first()
  await row.getByRole('button', { name: `Take down ${product.name}` }).click()

  const confirm = page.getByRole('button', { name: 'Take down', exact: true })
  await expect(confirm).toBeDisabled()
  await page.getByRole('button', { name: 'Counterfeit', exact: true }).click()
  await confirm.click()

  await expect(row.getByText('Taken down', { exact: true })).toBeVisible()
  await expect(row.getByText('Counterfeit', { exact: true })).toBeVisible()
  // Nguoi mua khong con thay san pham
  expect((await page.request.get(`${API}/products/${product.id}`)).status()).toBe(404)

  await row.getByRole('button', { name: `Restore ${product.name}` }).click()
  await expect(row.getByText('Live', { exact: true })).toBeVisible()
  expect((await page.request.get(`${API}/products/${product.id}`)).status()).toBe(200)
})

test('admin suspends a buyer, who then cannot log in; unsuspend restores access', async ({ page, browser }) => {
  await loginAs(page, 'admin@example.com')
  await page.goto(`/admin/customers?q=${encodeURIComponent(BUYER)}`)
  const row = page.getByRole('row').filter({ hasText: BUYER })
  await row.getByRole('button', { name: `Suspend ${BUYER}` }).click()
  await page.getByLabel('Reason').fill('Repeated payment fraud')
  await page.getByRole('button', { name: 'Suspend', exact: true }).click()
  await expect(row.getByText('Suspended', { exact: true })).toBeVisible()

  // Dang nhap bang giao dien o mot phien rieng (khong co token admin)
  const ctx = await browser.newContext()
  const buyerPage = await ctx.newPage()
  await buyerPage.goto('/')
  await buyerPage.getByRole('button', { name: 'Login / Sign Up' }).click()
  // Tim theo nhan, khong theo placeholder (placeholder doi khi thiet ke lai modal)
  await buyerPage.getByLabel('Email', { exact: true }).fill(BUYER)
  await buyerPage.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await buyerPage.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(buyerPage.getByText(/Your account has been suspended/)).toBeVisible()
  await ctx.close()

  await row.getByRole('button', { name: `Unsuspend ${BUYER}` }).click()
  await expect(row.getByText('Active', { exact: true })).toBeVisible()
  const login = await page.request.post(`${API}/auth/login`, { data: { email: BUYER, password: PASSWORD } })
  expect(login.ok()).toBeTruthy()
})
