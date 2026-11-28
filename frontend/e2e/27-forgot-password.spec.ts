import { expect, test } from '@playwright/test'
import { PASSWORD } from './helpers'

// Quen mat khau tu modal dang nhap: xin ma -> nhap ma + mat khau moi -> dang nhap lai.
// Dat lai bang chinh mat khau seed de khong lam hong cac spec khac; viec mat khau
// thuc su doi da co test backend 58-password-reset. Ma lay tu dev_code (OTP_EXPOSE_DEV_CODE=1).
const EMAIL = 'jane@example.com'

test('buyer resets the password from the login modal, then logs in', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Login / Sign Up' }).click()
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible()

  await page.getByLabel('Email', { exact: true }).fill(EMAIL)
  const sent = page.waitForResponse(r => r.url().includes('/auth/forgot-password'))
  await page.getByRole('button', { name: 'Send reset code' }).click()
  const res = await sent
  expect(res.status(), 'chay lai trong 60s se dinh cooldown').toBe(200)
  const code = (await res.json()).data.dev_code as string
  expect(code).toMatch(/^\d{6}$/)

  await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible()
  await page.getByLabel('Reset code').fill(code)
  await page.getByLabel('New password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Reset password', exact: true }).click()

  // Quay ve buoc dang nhap voi email dien san
  await expect(page.getByRole('heading', { name: /Log in to/ })).toBeVisible()
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible()
})
