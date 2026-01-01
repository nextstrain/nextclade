import { chromium } from '@playwright/test'

async function globalSetup() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('http://localhost:3000/')
  await page.waitForSelector('[role="navigation"]', { timeout: 30_000 })

  await context.close()
  await browser.close()
}

export default globalSetup
