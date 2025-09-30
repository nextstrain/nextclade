import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('Dataset LocalStorage Persistence', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
    // Navigate to app first, then clear localStorage for clean state
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test.describe('Default Server Persistence', () => {
    test('should persist dataset selection from default server across page reloads', async () => {
      // Select a dataset using URL params (default server)
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Verify dataset is loaded
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
      await expect(datasetLocator).toBeVisible()

      // Check localStorage has no serverUrl field (default server)
      const selection = await tester.page.evaluate(() => {
        const storage = localStorage.getItem('Nextclade-storage-v6')
        return storage ? JSON.parse(storage)?.datasetSelection : null
      })
      expect(selection).toBeTruthy()
      expect(selection.path).toContain('sars-cov-2') // Check that path contains sars-cov-2
      expect(selection.serverUrl).toBeUndefined() // No serverUrl for default server

      // Navigate to clean URL (no params)
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Verify dataset is still selected (persisted)
      const persistedDatasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
      await expect(persistedDatasetLocator).toBeVisible()
    })

    test('should persist different datasets and restore the latest one', async () => {
      // Select SARS-CoV-2 first
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Select RSV-A second (should overwrite)
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.RSV_A.name,
      })
      await tester.waitForDatasetLoaded()

      // Navigate to clean URL
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should restore RSV-A (the latest selection)
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.RSV_A.fullName)
      await expect(datasetLocator).toBeVisible()
    })

    test('should work with dataset tags', async () => {
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
        'dataset-tag': '2024-01-16--20-31-02Z',
      })
      await tester.waitForDatasetLoaded()

      // Check localStorage includes the tag
      const selection = await tester.page.evaluate(() => {
        const storage = localStorage.getItem('Nextclade-storage-v6')
        return storage ? JSON.parse(storage)?.datasetSelection : null
      })
      expect(selection.tag).toBe('2024-01-16--20-31-02Z')

      // Navigate to clean URL and verify persistence
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
      await expect(datasetLocator).toBeVisible()
    })
  })

  test.describe('Non-Default Server No Persistence', () => {
    test('should NOT persist dataset selection from non-default server URL', async () => {
      // Select dataset from production server (different from default server)
      await tester.navigateWithParams({
        'dataset-server': 'https://data.clades.nextstrain.org/v3',
        'dataset-name': TEST_DATASETS.RSV_A.name,
      })
      await tester.waitForDatasetLoaded()

      // Verify dataset is loaded
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.RSV_A.fullName)
      await expect(datasetLocator).toBeVisible()

      // Check localStorage has explicit serverUrl field (non-default server)
      const selection = await tester.page.evaluate(() => {
        const storage = localStorage.getItem('Nextclade-storage-v6')
        return storage ? JSON.parse(storage)?.datasetSelection : null
      })
      expect(selection).toBeTruthy()
      expect(selection.serverUrl).toBe('https://data.clades.nextstrain.org/v3')

      // Navigate to clean URL (no params)
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should show "Select reference dataset" (no persistence)
      await expect(tester.page.getByRole('button', { name: 'Select reference dataset' })).toBeVisible()

      // Verify localStorage selection should be cleared because non-default server not persisted
      const clearedSelection = await tester.page.evaluate(() => {
        const storage = localStorage.getItem('Nextclade-storage-v6')
        return storage ? JSON.parse(storage)?.datasetSelection : null
      })
      // Selection should be cleared when using non-default server
      expect(clearedSelection).toBeUndefined()
    })

    test('should NOT persist GitHub shortcut dataset selections', async () => {
      // Select dataset using GitHub shortcut from master branch
      await tester.navigateWithParams({
        'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output',
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Verify dataset is loaded
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
      await expect(datasetLocator).toBeVisible()

      // Check localStorage has resolved GitHub URL
      const selection = await tester.page.evaluate(() => {
        const storage = localStorage.getItem('Nextclade-storage-v6')
        return storage ? JSON.parse(storage)?.datasetSelection : null
      })
      expect(selection).toBeTruthy()
      expect(selection.serverUrl).toContain('raw.githubusercontent.com')

      // Navigate to clean URL
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should show "Select reference dataset" (no persistence)
      await expect(tester.page.getByRole('button', { name: 'Select reference dataset' })).toBeVisible()
    })

    test('should NOT persist custom server dataset selections', async () => {
      // Note: This test will fail if localhost:3001 is not running, but that's expected
      await tester.navigateWithParams({
        'dataset-server': 'http://localhost:3001',
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForAppLoaded() // Don't wait for dataset, might fail

      // Navigate to clean URL regardless of whether dataset loaded
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should show "Select reference dataset" (no persistence)
      await expect(tester.page.getByRole('button', { name: 'Select reference dataset' })).toBeVisible()
    })

    test('should NOT persist dataset with custom staging server URL', async () => {
      // Test with staging server (different from default)
      await tester.navigateWithParams({
        'dataset-server': 'https://data.staging.clades.nextstrain.org/v3',
        'dataset-name': TEST_DATASETS.RSV_A.name,
      })
      await tester.waitForDatasetLoaded()

      // Verify dataset is loaded
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.RSV_A.fullName)
      await expect(datasetLocator).toBeVisible()

      // Navigate to clean URL
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should show "Select reference dataset" (no persistence)
      await expect(tester.page.getByRole('button', { name: 'Select reference dataset' })).toBeVisible()
    })
  })

  test.describe('URL Params Always Take Precedence', () => {
    test('should override persisted dataset with URL params', async () => {
      // First, persist SARS-CoV-2 from default server
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Verify it's persisted by going to clean URL
      await tester.page.goto('/')
      await tester.waitForAppLoaded()
      const persistedDatasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
      await expect(persistedDatasetLocator).toBeVisible()

      // Now navigate with URL params for different dataset
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.RSV_A.name,
      })
      await tester.waitForDatasetLoaded()

      // Should show RSV-A (URL param takes precedence)
      const urlParamDatasetLocator = await tester.expectDatasetName(TEST_DATASETS.RSV_A.fullName)
      await expect(urlParamDatasetLocator).toBeVisible()
    })

    test('should override persisted dataset with non-default server URL params', async () => {
      // First, persist dataset from default server
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Then navigate with non-default server params
      await tester.navigateWithParams({
        'dataset-server': 'https://data.clades.nextstrain.org/v3',
        'dataset-name': TEST_DATASETS.RSV_A.name,
      })
      await tester.waitForDatasetLoaded()

      // Should show RSV-A from production server (URL params take precedence)
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.RSV_A.fullName)
      await expect(datasetLocator).toBeVisible()

      // Verify URL params are preserved
      const urlParams = await tester.getURLParams()
      expect(urlParams['dataset-server']).toBe('https://data.clades.nextstrain.org/v3')
      expect(urlParams['dataset-name']).toBe(TEST_DATASETS.RSV_A.name)
    })

    test('should override persisted dataset with GitHub shortcut URL params', async () => {
      // First, persist dataset from default server
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.FLU_H3N2.name,
      })
      await tester.waitForDatasetLoaded()

      // Then navigate with GitHub shortcut for different dataset
      await tester.navigateWithParams({
        'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output',
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Should show SARS-CoV-2 from GitHub (URL params take precedence)
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
      await expect(datasetLocator).toBeVisible()

      // Verify URL params are preserved
      const urlParams = await tester.getURLParams()
      expect(urlParams['dataset-server']).toBe('gh:nextstrain/nextclade_data@master@/data_output')
      expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    })
  })

  test.describe('Manual Dataset Selection', () => {
    test('should persist manually selected dataset from default server', async () => {
      // Start with clean state
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Manually select a dataset
      await tester.page.getByRole('button', { name: 'Select reference dataset' }).click()
      await tester.page.waitForSelector('text=SARS-CoV-2')
      await tester.page.click('text=SARS-CoV-2')

      // Wait for dataset to load
      await tester.waitForDatasetLoaded()

      // Navigate to clean URL
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should persist the manual selection
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
      await expect(datasetLocator).toBeVisible()
    })
  })

  test.describe('Mixed Scenarios', () => {
    test('should handle switching between default and non-default servers', async () => {
      // Start with default server dataset
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Switch to non-default server
      await tester.navigateWithParams({
        'dataset-server': 'https://data.clades.nextstrain.org/v3',
        'dataset-name': TEST_DATASETS.RSV_A.name,
      })
      await tester.waitForDatasetLoaded()

      // Go back to clean URL - should not persist non-default server selection
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should show "Select reference dataset" (non-default server selection not persisted)
      await expect(tester.page.getByRole('button', { name: 'Select reference dataset' })).toBeVisible()
    })

    test('should handle rapid dataset changes on default server', async () => {
      // Quickly change between datasets on default server
      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.RSV_A.name,
      })
      await tester.waitForDatasetLoaded()

      await tester.navigateWithParams({
        'dataset-name': TEST_DATASETS.FLU_H3N2.name,
      })
      await tester.waitForDatasetLoaded()

      // Go to clean URL
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should persist the last selection (Flu H3N2)
      const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.FLU_H3N2.fullName)
      await expect(datasetLocator).toBeVisible()
    })

    test('should handle switching between GitHub branches', async () => {
      // Start with GitHub master branch
      await tester.navigateWithParams({
        'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output',
        'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      })
      await tester.waitForDatasetLoaded()

      // Navigate directly to clean URL - should not persist GitHub selections
      await tester.page.goto('/')
      await tester.waitForAppLoaded()

      // Should show "Select reference dataset" (GitHub selections not persisted)
      await expect(tester.page.getByRole('button', { name: 'Select reference dataset' })).toBeVisible()
    })
  })
})
