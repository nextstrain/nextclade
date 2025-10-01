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
    await tester.checkForErrors()

    const datasetLocator = await tester.getDatasetNameLocator(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible({ timeout: 5000 })
  })

  test('should load different datasets with dataset-name parameter', async () => {
    // Test RSV-A dataset
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.RSV_A.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const rsvLocator = await tester.getDatasetNameLocator(TEST_DATASETS.RSV_A.fullName)
    await expect(rsvLocator).toBeVisible({ timeout: 5000 })
  })

  test('should handle dataset-name with dataset-tag parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const datasetLocator = await tester.getDatasetNameLocator(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible({ timeout: 5000 })
  })

  test('should handle custom dataset-server parameter', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://data.clades.nextstrain.org/v3',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const datasetLocator = await tester.getDatasetNameLocator(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible({ timeout: 5000 })
  })

  test('should handle GitHub shortcut for dataset-server', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const datasetLocator = await tester.getDatasetNameLocator(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible({ timeout: 5000 })
  })

  test('should handle invalid dataset name gracefully', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'invalid-dataset-name-that-does-not-exist',
    })

    // Wait for the page to load
    await tester.waitForAppLoaded()

    // App should load without crashing - check that navigation bar is visible
    const navElement = await tester.page.locator('[role="navigation"]').isVisible()
    expect(navElement).toBe(true)
  })

  test('should handle valid dataset name but invalid tag gracefully', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': 'invalid-tag-that-does-not-exist',
    })

    // Wait for the page to load
    await tester.waitForAppLoaded()

    // App should load without crashing - check that navigation bar is visible
    const navElement = await tester.page.locator('[role="navigation"]').isVisible()
    expect(navElement).toBe(true)
  })

  test('should show appropriate error message for invalid dataset name', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'totally-invalid-dataset-name',
    })

    await tester.waitForAppLoaded()

    // Wait for error boundary to render the error message
    await tester.page.waitForSelector('h2:has-text("An unexpected error has occurred")', { timeout: 5000 })

    // Check for error message that suggests similar dataset names
    const errorMessage = await tester.page.textContent('body')
    expect(errorMessage).toContain("unable to find the dataset with name='totally-invalid-dataset-name'")
    expect(errorMessage).toContain('Did you mean one of:')
  })

  test('should show appropriate error message for valid name but invalid tag', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': 'invalid-tag-123',
    })

    await tester.waitForAppLoaded()

    // Wait for error boundary to render the error message
    await tester.page.waitForSelector('h2:has-text("An unexpected error has occurred")', { timeout: 5000 })

    // Check for error message that shows available tags for the correct dataset name
    const errorMessage = await tester.page.textContent('body')
    expect(errorMessage).toContain(`dataset with name='${TEST_DATASETS.SARS_COV_2.name}' exists`)
    expect(errorMessage).toContain("tag='invalid-tag-123' was not found")
    expect(errorMessage).toContain('Available tags:')
  })

  test('should show appropriate error message for both invalid name and tag', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'totally-invalid-name',
      'dataset-tag': 'totally-invalid-tag',
    })

    await tester.waitForAppLoaded()

    // Wait for error boundary to render the error message
    await tester.page.waitForSelector('h2:has-text("An unexpected error has occurred")', { timeout: 5000 })

    // Check for error message that suggests similar dataset names (ignores invalid tag)
    const errorMessage = await tester.page.textContent('body')
    expect(errorMessage).toContain(
      "unable to find the dataset with name='totally-invalid-name' and tag 'totally-invalid-tag",
    )
    expect(errorMessage).toContain('Did you mean one of:')
  })

  test('should preserve URL parameters after navigation', async () => {
    const params = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
    }

    await tester.navigateWithParams(params)
    await tester.waitForDatasetLoaded()

    // Verify URL parameters are preserved
    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(params['dataset-name'])
    expect(urlParams['dataset-tag']).toBe(params['dataset-tag'])
  })

  test('should handle parameter conflicts gracefully', async () => {
    // Test that dataset-url and dataset-json-url can be used (they may not actually conflict)
    await tester.navigateWithParams({
      'dataset-url':
        'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2024-07-17--12-47-30Z/',
      'dataset-json-url': 'https://example.com/dataset.json',
    })

    await tester.waitForAppLoaded()

    // App should load without crashing - check that navigation bar is visible
    const navElement = await tester.page.locator('[role="navigation"]').isVisible()
    expect(navElement).toBe(true)
  })
})
