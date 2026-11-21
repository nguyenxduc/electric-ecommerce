import { defineConfig, devices } from '@playwright/test'

// Cau hinh rieng de quay video demo tour (khong chay chung voi e2e thuong)
export default defineConfig({
  testDir: './e2e-demo',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 15 * 60_000,
  reporter: 'list',
  outputDir: 'demo-output',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    headless: process.env.DEMO_HEADED !== '1',
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    launchOptions: { slowMo: Number(process.env.DEMO_SLOWMO ?? 250) }
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000
  }
})
