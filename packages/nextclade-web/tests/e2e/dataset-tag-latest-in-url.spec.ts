import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('Dataset Tag Latest in URL', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
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
