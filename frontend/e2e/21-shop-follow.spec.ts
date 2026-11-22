import { test, expect } from '@playwright/test'
import { loginAs, API } from './helpers'

// Theo doi shop: khach bam -> modal dang nhap; buyer theo doi/bo theo doi, so dem doi ngay,
// shop hien trong tab "Followed shops" cua profile.
const SLUG = 'tech-world'

test('guest is asked to log in, buyer can follow and unfollow a shop', async ({ page }) => {
  // Don dep truoc: bo theo doi neu lan chay truoc de lai
  const token = await loginAs(page, 'jane@example.com')
  await page.request.delete(`${API}/shops/${SLUG}/follow`, { headers: { Authorization: `Bearer ${token}` } })

  // Khach: bam Follow mo modal dang nhap
  const guest = await page.context().browser()!.newPage({ baseURL: test.info().project.use.baseURL })
  await guest.goto(`/shop/${SLUG}`)
  await guest.getByRole('button', { name: /^Follow/ }).click()
  await expect(guest.getByRole('heading', { name: /^Log in to / })).toBeVisible()
  await guest.close()

  // Buyer theo doi
  await page.goto(`/shop/${SLUG}`)
  const follow = page.getByRole('button', { name: /^Follow/ })
  const before = Number((await follow.innerText()).match(/\((\d+)\)/)![1])
  await follow.click()
  const following = page.getByRole('button', { name: /^Following/ })
  await expect(following).toContainText(`(${before + 1})`)

  // Hien trong tab Followed shops
  await page.goto('/profile?tab=following')
  await expect(page.getByRole('link', { name: 'Tech World' })).toBeVisible()

  // Bo theo doi ngay tren tab
  await page.getByRole('button', { name: 'Unfollow' }).first().click()
  await expect(page.getByText('You are not following any shop yet.')).toBeVisible()
})
