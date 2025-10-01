import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe.serial('Dataset Tag Persistence', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
  })

  test('should NOT persist latest dataset tags when selected via UI', async () => {
    await tester.page.evaluate(() => {
      localStorage.clear()
    })

    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
    })
    await tester.waitForDatasetLoaded()

    const selection = await tester.page.evaluate(() => {
      const storage = localStorage.getItem('Nextclade-storage-v6')
      return storage ? JSON.parse(storage)?.datasetSelection : null
    })
    expect(selection).toBeTruthy()
    expect(selection.path).toContain('sars-cov-2')
    expect(selection.tag).toBeUndefined()

    await tester.page.goto('/')
    await tester.waitForAppLoaded()

    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
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

  test('should NOT persist latest tags when explicitly specified in URL', async () => {
    const latestTag = await tester.page.evaluate(async () => {
      const response = await fetch('https://data.clades.nextstrain.org/v3/index.json')
      const index = await response.json()
      const dataset = index.collections
        .find((c: { meta: { id: string } }) => c.meta.id === 'nextstrain')
        ?.datasets.find((d: { path: string }) => d.path.includes('sars-cov-2/wuhan-hu-1/orfs'))
      return dataset?.versions[0]?.tag
    })

    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
      'dataset-tag': latestTag,
    })
    await tester.waitForDatasetLoaded()

    const selection = await tester.page.evaluate(() => {
      const storage = localStorage.getItem('Nextclade-storage-v6')
      return storage ? JSON.parse(storage)?.datasetSelection : null
    })
    expect(selection).toBeTruthy()
    expect(selection.path).toContain('sars-cov-2')
    expect(selection.tag).toBeUndefined()

    await tester.page.goto('/')
    await tester.waitForAppLoaded()

    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })
})
