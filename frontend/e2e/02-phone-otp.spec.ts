import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

const restore = () =>
  execFileSync('node', [path.join(process.cwd(), 'e2e', 'restore-phone.mjs'), 'jane@example.com', '0987654321'], {
    cwd: path.join(process.cwd(), '../backend'),
    stdio: 'inherit'
  })

// Dua phone ve trang thai chua xac thuc truoc va sau test
test.beforeAll(restore)
test.afterAll(restore)

test('buyer: verify phone via OTP dev code', async ({ page }) => {
  await loginAs(page, 'jane@example.com')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Security & access' }).click()

  await expect(page.getByText('Phone verification')).toBeVisible()
  await expect(page.getByText('Verified', { exact: true })).toBeHidden()

  await page.getByRole('button', { name: 'Send code' }).click()
  const hint = page.getByText(/Dev code: \d+/)
  await expect(hint).toBeVisible()
  const code = (await hint.textContent())!.match(/\d+/)![0]

  await page.getByPlaceholder('6-digit code').fill(code)
  await page.getByRole('button', { name: 'Verify', exact: true }).click()
  await expect(page.getByText('Verified', { exact: true })).toBeVisible()
})
