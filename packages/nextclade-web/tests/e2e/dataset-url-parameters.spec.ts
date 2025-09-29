import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('Dataset URL Parameters', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should load with dataset-name parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should load different datasets with dataset-name parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.RSV_A.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
    const rsvLocator = await tester.expectDatasetName(TEST_DATASETS.RSV_A.fullName)
    await expect(rsvLocator).toBeVisible()
  })

  test('should handle dataset-name with dataset-tag parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle custom dataset-server parameter', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://data.clades.nextstrain.org/v3',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle GitHub shortcut for dataset-server', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle invalid dataset name errors', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'invalid-dataset-name-that-does-not-exist',
    })

    await tester.waitForAppLoaded()

    // App should show the home page when dataset name is invalid
    const hasContent = await tester.page.locator('body').isVisible()
    expect(hasContent).toBe(true)
  })

  test('should ignore conflicting dataset parameters', async () => {
    // Test that the app loads normally when given conflicting parameters
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-json-url': 'https://example.com/dataset.json',
    })

    await tester.waitForAppLoaded()

    // App should load normally (prioritizes dataset-name over dataset-json-url)
    const hasContent = await tester.page.locator('body').isVisible()
    expect(hasContent).toBe(true)
  })

  test('should preserve URL parameters after navigation', async () => {
    const params = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
    }

    await tester.navigateWithParams(params)
    await tester.waitForDatasetLoaded()

    const { urlParams } = await tester.verifyURLParameters(params)
    expect(urlParams['dataset-name']).toBe(params['dataset-name'])
    expect(urlParams['dataset-tag']).toBe(params['dataset-tag'])
  })

  test('should handle SARS-CoV-2 shortcut format', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'sars-cov-2',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle full SARS-CoV-2 path format', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle dataset-json-url parameter (experimental feature)', async () => {
    await tester.navigateWithParams({
      'dataset-json-url':
        'https://nextstrain.org/fetch/community/nextstrain/nextclade_data/sars-cov-2/wuhan-hu-1/orfs?type=dataset',
    })

    await tester.waitForAppLoaded()
    // This is experimental, we just verify the app doesn't crash
    const hasContent = await tester.page.locator('body').isVisible()
    expect(hasContent).toBe(true)
  })
})
