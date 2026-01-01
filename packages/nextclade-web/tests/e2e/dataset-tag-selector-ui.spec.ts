import { test, expect } from '@playwright/test'
import { URLParameterTester, CURRENT_DATASET_TAGS } from './helpers/url-parameters'

test.describe('Dataset Tag Selector UI', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
  })

  test('should show dropdown or text for dataset versions', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
    })
    await tester.waitForDatasetLoaded()

    const updatedAtLine = tester.page
      .locator('span')
      .filter({ hasText: /Updated at:/ })
      .first()
    await expect(updatedAtLine).toBeVisible()
  })

  test('should persist non-latest tag selection on reload', async () => {
    const { page } = tester
    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
      'dataset-tag': CURRENT_DATASET_TAGS.SARS_COV_2,
    })
    await tester.waitForDatasetLoaded()

    const selection = await page.evaluate(() => {
      const storage = localStorage.getItem('Nextclade-storage-v6')
      return storage ? JSON.parse(storage)?.datasetSelection : null
    })

    expect(selection).toBeTruthy()
    expect(selection.path).toContain('sars-cov-2')
    expect(selection.tag).toBe(CURRENT_DATASET_TAGS.SARS_COV_2)

    await page.goto('/')
    await tester.waitForDatasetLoaded()

    const updatedAtLabel = page.locator('span').filter({ hasText: 'Updated at:' }).first()
    await expect(updatedAtLabel).toBeVisible()

    const updatedAtDate = page
      .locator('span')
      .filter({ hasText: /2025-09-09/ })
      .first()
    await expect(updatedAtDate).toBeVisible()
  })

  test('should NOT persist latest tag selection', async () => {
    const { page } = tester
    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
    })
    await tester.waitForDatasetLoaded()

    const selection = await page.evaluate(() => {
      const storage = localStorage.getItem('Nextclade-storage-v6')
      return storage ? JSON.parse(storage)?.datasetSelection : null
    })

    expect(selection).toBeTruthy()
    expect(selection.path).toContain('sars-cov-2')
    expect(selection.tag).toBeUndefined()
  })

  test('should override persisted tag with URL parameter', async () => {
    const { page } = tester
    await page.evaluate((tag) => {
      const storage = {
        datasetSelection: {
          path: 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
          tag,
        },
      }
      localStorage.setItem('Nextclade-storage-v6', JSON.stringify(storage))
    }, CURRENT_DATASET_TAGS.SARS_COV_2)

    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
    })
    await tester.waitForDatasetLoaded()

    const updatedAtLine = page
      .locator('span')
      .filter({ hasText: /Updated at:/ })
      .first()
    await expect(updatedAtLine).toBeVisible()
  })

  test('should work on datasets page', async () => {
    const { page } = tester
    await page.goto('/dataset')
    await tester.waitForAppLoaded()

    await page.getByText('SARS-CoV-2').first().click()
    await page.waitForTimeout(1000)

    const updatedAtLine = page
      .locator('span')
      .filter({ hasText: /Updated at:/ })
      .first()
    await expect(updatedAtLine).toBeVisible()
  })

  test('should maintain tag selection when navigating between pages', async () => {
    const { page } = tester
    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
      'dataset-tag': CURRENT_DATASET_TAGS.SARS_COV_2,
    })
    await tester.waitForDatasetLoaded()

    await page.getByRole('link', { name: 'About' }).click()
    await expect(page).toHaveURL(/.*about/)

    await page.getByRole('link', { name: 'Start' }).click()
    await tester.waitForDatasetLoaded()

    const updatedAtLabel = page.locator('span').filter({ hasText: 'Updated at:' }).first()
    await expect(updatedAtLabel).toBeVisible()

    const updatedAtDate = page
      .locator('span')
      .filter({ hasText: /2025-09-09/ })
      .first()
    await expect(updatedAtDate).toBeVisible()
  })
})
