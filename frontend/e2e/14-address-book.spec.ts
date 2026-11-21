import { expect, test, type Page } from '@playwright/test'
import { API, clearCart, loginAs } from './helpers'

// Xoa het so dia chi qua API de test lap lai duoc va khong anh huong spec khac (08 dung john)
const wipeAddresses = async (page: Page, headers: Record<string, string>) => {
  const list = (await (await page.request.get(`${API}/addresses`, { headers })).json()).data as { id: number }[]
  for (const a of list) await page.request.delete(`${API}/addresses/${a.id}`, { headers })
}

const addAddress = async (page: Page, a: { name: string; phone: string; province: string; street: string }) => {
  await page.getByRole('button', { name: 'Add new address' }).click()
  const dialog = page.getByRole('dialog', { name: 'New address' })
  await dialog.getByLabel('Receiver name').fill(a.name)
  await dialog.getByLabel('Phone number').fill(a.phone)
  await dialog.getByLabel('Province / City').fill(a.province)
  await dialog.getByLabel('Street address').fill(a.street)
  await dialog.getByRole('button', { name: 'Save address' }).click()
  await expect(dialog).toBeHidden()
}

test('buyer: address book + checkout prefills the default address', async ({ page }) => {
  const token = await loginAs(page, 'john@example.com')
  const headers = { Authorization: `Bearer ${token}` }
  await wipeAddresses(page, headers)
  await clearCart(page, token)
  try {
    await page.goto('/profile?tab=addresses')
    await expect(page.getByRole('heading', { name: 'My addresses' })).toBeVisible()

    // Validate inline: SDT sai khong gui len server
    await page.getByRole('button', { name: 'Add new address' }).click()
    const dialog = page.getByRole('dialog', { name: 'New address' })
    await dialog.getByLabel('Phone number').fill('123')
    await dialog.getByRole('button', { name: 'Save address' }).click()
    await expect(dialog.getByText('Enter a valid phone number')).toBeVisible()
    await expect(dialog.getByText('Please enter the receiver name')).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    await addAddress(page, { name: 'John Home', phone: '0912345678', province: 'Ho Chi Minh', street: '1 Le Loi' })
    await addAddress(page, { name: 'John Office', phone: '0987654321', province: 'Ha Noi', street: '9 Trang Tien' })

    const cards = page.getByTestId('address-card')
    await expect(cards).toHaveCount(2)
    // Dia chi dau tien tu thanh mac dinh
    await expect(cards.filter({ hasText: 'John Home' }).getByText('Default', { exact: true })).toBeVisible()

    await cards.filter({ hasText: 'John Office' }).getByRole('button', { name: 'Set as default' }).click()
    await expect(cards.first()).toContainText('John Office')
    await expect(cards.first().getByText('Default', { exact: true })).toBeVisible()
    await expect(page.getByText('Default', { exact: true })).toHaveCount(1)

    // Gio co mot san pham -> checkout dien san dia chi mac dinh
    const p = (await (await page.request.get(`${API}/products?search=MacBook&limit=1`)).json()).products[0]
    const r = await page.request.post(`${API}/cart/add_item/${p.id}`, {
      headers,
      data: { quantity: 1, color: p.available_colors?.[0] ?? null, variant_id: p.variants?.[0]?.id }
    })
    expect(r.ok(), await r.text()).toBeTruthy()

    await page.goto('/checkout')
    const deliver = page.getByTestId('deliver-to')
    await expect(deliver).toContainText('John Office')
    await expect(deliver).toContainText('9 Trang Tien, Ha Noi')

    // Doi sang dia chi khac qua picker
    await deliver.getByRole('button', { name: 'Change' }).click()
    await page.getByRole('dialog', { name: 'Choose a delivery address' }).getByText('John Home').click()
    await expect(deliver).toContainText('1 Le Loi, Ho Chi Minh')

    // Edit mo lai cac o nhap tay voi gia tri da dien
    await deliver.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByPlaceholder('Street, city, district...')).toHaveValue('1 Le Loi')
    await expect(page.getByPlaceholder('Full name')).toHaveValue('John Home')
  } finally {
    await wipeAddresses(page, headers)
    await clearCart(page, token)
  }
})
