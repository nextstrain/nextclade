import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS, TEST_INPUT_FILES } from './helpers/url-parameters'

test.describe('Combined URL Parameter Tests', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should handle dataset + example sequences combination', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForAppLoaded()
    await tester.checkForErrors()

    // Verify URL parameters are preserved
    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['input-fasta']).toBe('example')
  })

  test('should handle custom dataset server + dataset + input files', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://data.clades.nextstrain.org/v3',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('https://data.clades.nextstrain.org/v3')
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['input-fasta']).toBe('example')
  })

  test('should handle GitHub shortcuts for dataset server + input files', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.GITHUB_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toContain('gh:nextstrain/nextclade_data')
    expect(urlParams['input-fasta']).toContain('gh:nextstrain/nextclade_data')
  })

  test('should handle dataset with tag + multiple input files', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
      'input-ref': 'https://example.com/reference.fasta',
      'input-annotation': 'https://example.com/annotation.gff3',
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['dataset-tag']).toBe('2025-09-19--14-53-06Z')
    expect(urlParams['input-fasta']).toBe('example')
    expect(urlParams['input-ref']).toBe('https://example.com/reference.fasta')
    expect(urlParams['input-annotation']).toBe('https://example.com/annotation.gff3')
  })

  test('should handle different datasets with their appropriate input files', async () => {
    // Test RSV-A dataset with example sequences
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.RSV_A.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForAppLoaded()
    await tester.checkForErrors()

    // Verify URL parameters are preserved
    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.RSV_A.name)
    expect(urlParams['input-fasta']).toBe('example')

    // Switch to Flu H3N2 dataset
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.FLU_H3N2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForAppLoaded()
    await tester.checkForErrors()

    // Verify URL parameters are preserved for flu
    const urlParamsFlu = await tester.getURLParams()
    expect(urlParamsFlu['dataset-name']).toBe(TEST_DATASETS.FLU_H3N2.name)
    expect(urlParamsFlu['input-fasta']).toBe('example')
  })

  test('should handle all possible input parameters together', async () => {
    const allParams = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    }

    await tester.navigateWithParams(allParams)
    await tester.waitForAppLoaded()
    await tester.checkForErrors()

    // Verify all parameters are preserved
    const urlParams = await tester.getURLParams()
    Object.entries(allParams).forEach(([key, expectedValue]) => {
      expect(urlParams[key]).toBe(expectedValue)
    })
  })

  test('should handle all possible input parameters with dataset tag', async () => {
    const allParams = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    }

    await tester.navigateWithParams(allParams)
    await tester.waitForAppLoaded()
    await tester.checkForErrors()

    // Verify all parameters are preserved
    const urlParams = await tester.getURLParams()
    Object.entries(allParams).forEach(([key, expectedValue]) => {
      expect(urlParams[key]).toBe(expectedValue)
    })
  })

  test('should preserve parameters when navigating between pages', async () => {
    const params = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    }

    await tester.navigateWithParams(params)
    await tester.waitForDatasetLoaded()

    // Navigate to dataset page
    await tester.page.click('text=Dataset')
    await tester.waitForDatasetLoaded()

    // Check that URL parameters are still preserved
    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(params['dataset-name'])
    expect(urlParams['input-fasta']).toBe(params['input-fasta'])
  })

  test('should handle URL encoding of special characters', async () => {
    const complexUrl = 'https://example.com/path with spaces/file (1).fasta?param=value&other=test'

    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': complexUrl,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    // The browser should handle URL encoding automatically
    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['input-fasta']).toBe(complexUrl)
  })

  test('should handle empty and undefined parameters gracefully', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': '', // Empty string
      // input-ref is undefined (not provided)
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    // Empty string should be preserved
    expect(urlParams['input-fasta']).toBe('')
    // Undefined parameters should not appear in URL
    expect(urlParams['input-ref']).toBeUndefined()
  })
})
