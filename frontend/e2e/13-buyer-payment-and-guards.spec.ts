import { expect, test } from '@playwright/test'
import { API, loginAs } from './helpers'

// Khach chua dang nhap mo /profile: hien loi moi dang nhap, khong goi API don hang
test('guest: profile orders shows login prompt without calling orders API', async ({ page }) => {
  const orderCalls: string[] = []
  page.on('request', r => r.url().includes('/orders/user/orders') && orderCalls.push(r.url()))

  await page.goto('/profile?tab=orders')
  await expect(page.getByText('Please log in to view your account')).toBeVisible()
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /^Log in to / })).toBeVisible()
  expect(orderCalls).toEqual([])
})

// Don MoMo chua tra: "Waiting for payment" + "Pay now" goi endpoint retry
test('buyer: unpaid MoMo order can be paid again', async ({ page }) => {
  const token = await loginAs(page, 'jane@example.com')
  const headers = { Authorization: `Bearer ${token}`, 'X-Device-Id': 'e2e-buyer-payment' }

  const p = (await (await page.request.get(`${API}/products?limit=1`)).json()).products[0]
  const created = await page.request.post(`${API}/orders`, {
    headers,
    data: {
      items: [{ product_id: p.id, quantity: 1, color: p.available_colors?.[0] || null }],
      shipping_address: { name: 'Jane', phone: '0912345678', address: 'Demo St' },
      payment_method: 'momo'
    }
  })
  expect(created.status()).toBe(201)
  const order = (await created.json()).orders[0] as { id: number; order_number: string }

  // Chan cong MoMo that: tra payUrl gia ve trang chu
  let retryBody: unknown = null
  await page.route('**/api/payments/momo/retry', async route => {
    retryBody = route.request().postDataJSON()
    await route.fulfill({ json: { payUrl: '/?paid=e2e', orderId: 'X', amount: 1, orderInfo: '' } })
  })

  try {
    await page.goto('/profile?tab=orders')
    await page.getByRole('tablist').getByRole('tab', { name: /^To pay/ }).click()
    const card = page.locator('div.rounded-xl').filter({ hasText: order.order_number })
    await expect(card.getByRole('button', { name: 'Pay now' })).toBeVisible()
    await card.getByRole('button', { name: /View details/ }).click()
    await expect(page.getByText('Waiting for payment')).toBeVisible()
    await expect(page.getByRole('definition').filter({ hasText: /^MoMo$/ })).toBeVisible()

    await page.getByRole('button', { name: 'Pay now' }).click()
    await page.waitForURL(/paid=e2e/)
    expect(retryBody).toMatchObject({ order_group_id: expect.anything() })
  } finally {
    await page.request.patch(`${API}/orders/${order.id}/cancel`, { headers, data: { reason: 'e2e' } })
  }
})

test('product page: missing product shows not-found state', async ({ page }) => {
  await page.goto('/product/no-such-thing-p99999999')
  await expect(page.getByText('This product is no longer available')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/collection/all')
})
