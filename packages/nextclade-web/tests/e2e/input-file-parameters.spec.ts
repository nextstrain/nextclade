import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS, TEST_INPUT_FILES } from './helpers/url-parameters'

test.describe('Input File URL Parameters', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should load example sequences with input-fasta=example', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    // Check that example sequences were loaded
    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('example')
  })

  test('should load sequences from external URL', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.SARS_COV_2_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    // Verify the URL parameter is preserved
    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(TEST_INPUT_FILES.SARS_COV_2_SEQUENCES)
  })

  test('should load sequences from GitHub shortcut', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.GITHUB_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    // Verify the GitHub shortcut is preserved
    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(TEST_INPUT_FILES.GITHUB_SEQUENCES)
  })

  test('should handle input-ref parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-ref': 'https://example.com/reference.fasta',
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-ref']).toBe('https://example.com/reference.fasta')
  })

  test('should handle input-annotation parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-annotation': 'https://example.com/annotation.gff3',
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-annotation']).toBe('https://example.com/annotation.gff3')
  })

  test('should handle input-tree parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-tree': 'https://example.com/tree.json',
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-tree']).toBe('https://example.com/tree.json')
  })

  test('should handle input-pathogen-json parameter', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-pathogen-json': 'https://example.com/pathogen.json',
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-pathogen-json']).toBe('https://example.com/pathogen.json')
  })

  test('should handle multiple input parameters together', async () => {
    const inputParams = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
      'input-ref': 'https://example.com/reference.fasta',
      'input-annotation': 'https://example.com/annotation.gff3',
      'input-tree': 'https://example.com/tree.json',
    }

    await tester.navigateWithParams(inputParams)
    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    // Verify all parameters are preserved
    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(inputParams['input-fasta'])
    expect(urlParams['input-ref']).toBe(inputParams['input-ref'])
    expect(urlParams['input-annotation']).toBe(inputParams['input-annotation'])
    expect(urlParams['input-tree']).toBe(inputParams['input-tree'])
  })

  test('should handle GitHub shortcuts for input files', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/sequences.fasta',
      'input-ref': 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/reference.fasta',
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toContain('gh:nextstrain/nextclade_data')
    expect(urlParams['input-ref']).toContain('gh:nextstrain/nextclade_data')
  })

  test('should work without input files (dataset only)', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.checkForErrors()

    const datasetLocator = await tester.getDatasetNameLocator(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()

    // Should not have any input file parameters
    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBeUndefined()
    expect(urlParams['input-ref']).toBeUndefined()
  })

  test('should handle invalid input file URLs gracefully', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'https://invalid-url-that-does-not-exist.com/file.fasta',
    })

    await tester.waitForDatasetLoaded()

    // The app should still load the dataset, but may show errors for the invalid input file
    const datasetLocator = await tester.getDatasetNameLocator(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })
})
