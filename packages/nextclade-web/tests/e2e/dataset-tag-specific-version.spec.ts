import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('Dataset Tag Specific Version', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
  })

  test('should persist non-latest dataset tags', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
      'dataset-tag': '2024-01-16--20-31-02Z',
    })
    await tester.waitForDatasetLoaded()

    const selection = await tester.page.evaluate(() => {
      const storage = localStorage.getItem('Nextclade-storage-v6')
      return storage ? JSON.parse(storage)?.datasetSelection : null
    })
    expect(selection.tag).toBe('2024-01-16--20-31-02Z')

    await tester.page.goto('/')
    await tester.waitForAppLoaded()

    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()

    const restoredSelection = await tester.page.evaluate(() => {
      const storage = localStorage.getItem('Nextclade-storage-v6')
      return storage ? JSON.parse(storage)?.datasetSelection : null
    })
    expect(restoredSelection.tag).toBe('2024-01-16--20-31-02Z')
  })
})
