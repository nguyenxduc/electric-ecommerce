import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  // Cac spec phu thuoc nhau qua e2e/.state.json (don hang tu test 1) nen chay tuan tu
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000
  }
})
