import { test, expect } from '@playwright/test'

test.describe('Basic Nextclade Web Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/')

    // Wait for the navigation to be visible
    await page.waitForSelector('[role="navigation"]')

    // Check that the page title contains "Nextclade"
    await expect(page).toHaveTitle(/Nextclade/)

    // Check that main elements are visible
    await expect(page.getByText('Start')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dataset' })).toBeVisible()
  })

  test('should handle basic navigation', async ({ page }) => {
    await page.goto('/')

    // Wait for page to load
    await page.waitForSelector('[role="navigation"]')

    // Click on About link
    await page.getByRole('link', { name: 'About' }).click()

    // Should navigate to about page
    await expect(page).toHaveURL(/.*about/)

    // Should show about content
    await expect(page.getByText('What is Nextclade?')).toBeVisible()
  })
})
