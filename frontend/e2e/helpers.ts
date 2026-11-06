import fs from 'node:fs'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'

export const API = 'http://localhost:3000/api'
export const PASSWORD = 'password123'
const STATE_FILE = path.join(process.cwd(), 'e2e', '.state.json')

// Don hang tao o test 1 duoc cac spec sau dung lai
export const saveState = (s: Record<string, unknown>) =>
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...loadState(), ...s }))
export const loadState = (): Record<string, any> => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

// Dang nhap bang API roi nhet token vao localStorage truoc khi app load (nhanh, on dinh)
export async function loginAs(page: Page, email: string) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email, password: PASSWORD }
  })
  expect(res.ok()).toBeTruthy()
  const token = (await res.json()).data.accessToken as string
  await page.addInitScript(t => localStorage.setItem('accessToken', t), token)
  return token
}

export async function clearCart(page: Page, token: string) {
  await page.request.delete(`${API}/cart/clear`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}
