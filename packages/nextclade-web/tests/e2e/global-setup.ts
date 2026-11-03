import { chromium, type FullConfig } from '@playwright/test'

/** Open the app once before the tests, so that the dev server compiles its pages before the first test times out */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL
  if (!baseURL) {
    throw new Error('The Playwright config has no base URL of the app')
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(baseURL)
  await page.waitForSelector('[role="navigation"]', { timeout: 30_000 })

  await context.close()
  await browser.close()
}

export default globalSetup
