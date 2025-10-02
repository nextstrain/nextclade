import { defineConfig, devices, PlaywrightTestConfig } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.WEB_PORT_DEV ?? '3000'}`

const OUT_DIR = process.env.PLAYWRIGHT_OUTPUT_DIR ?? './.cache/e2e'

const CHROME_ARGS = [
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-setuid-sandbox',
  '--no-sandbox',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-first-run',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
]

const config: PlaywrightTestConfig = {
  name: BASE_URL,
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : '75%',
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 60_000 },
  use: {
    baseURL: BASE_URL,
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
  },

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: undefined,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: CHROME_ARGS } },
    },
  ],

  outputDir: `${OUT_DIR}/test-results`,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${OUT_DIR}/report`, open: 'never' }],
    ['junit', { outputFile: `${OUT_DIR}/results.junit.xml` }],
    ['json', { outputFile: `${OUT_DIR}/results.playwright.json` }],
  ],
}

export default defineConfig(config)
