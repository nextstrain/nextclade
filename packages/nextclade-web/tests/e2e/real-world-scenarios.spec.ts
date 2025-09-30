import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS, TEST_INPUT_FILES } from './helpers/url-parameters'

test.describe('Real-World URL Parameter Scenarios', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should handle typical user workflow: select dataset and run example', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.SARS_COV_2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle researcher workflow: custom dataset with external sequences', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.SARS_COV_2_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
  })

  test('should handle testing workflow: local dataset server with example sequences', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'http://localhost:3001',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('http://localhost:3001')
  })

  test('should handle integration workflow: third-party integration with direct dataset URL', async () => {
    await tester.navigateWithParams({
      'dataset-url':
        'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2025-09-19--14-53-06Z/',
      'input-fasta': 'https://example.com/sequences.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-url']).toContain('data.clades.nextstrain.org')
    expect(urlParams['input-fasta']).toBe('https://example.com/sequences.fasta')
  })

  test('should handle CI/CD workflow: automated testing with specific dataset version', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-tag']).toBe('2025-09-19--14-53-06Z')
  })

  test('should handle documentation workflow: sharing links with complete setup', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
      'input-ref': 'https://example.com/reference.fasta',
      'input-tree': 'https://example.com/tree.json',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['input-fasta']).toBe('example')
  })

  test('should handle outbreak response workflow: quick analysis with latest data', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'https://example.com/outbreak/sequences.fasta',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
  })

  test('should handle education workflow: students accessing pre-configured analysis', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.RSV_A.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.RSV_A.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle development workflow: testing with GitHub branch', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
  })

  test('should handle comparison workflow: analyzing multiple virus types', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.FLU_H3N2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const datasetLocator = await tester.expectDatasetName(TEST_DATASETS.FLU_H3N2.fullName)
    await expect(datasetLocator).toBeVisible()
  })

  test('should handle legacy URL workflow: supporting old URL formats', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'sars-cov-2',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()
  })

  test('should handle bookmark workflow: user returns to saved analysis', async () => {
    const bookmarkParams = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    }

    await tester.navigateWithParams(bookmarkParams)
    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(bookmarkParams['dataset-name'])
    expect(urlParams['dataset-tag']).toBe(bookmarkParams['dataset-tag'])
  })

  test('should handle API integration workflow: external system calling Nextclade', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://data.clades.nextstrain.org/v3',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'https://api.example.com/sequences.fasta',
    })

    await tester.waitForDatasetLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('https://data.clades.nextstrain.org/v3')
  })

  test('should handle mobile workflow: accessing from mobile device', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
  })

  test('should handle email link workflow: user clicks link from email', async () => {
    const emailLinkParams = {
      'dataset-name': TEST_DATASETS.RSV_A.name,
      'input-fasta': 'https://shared-storage.example.com/sequences.fasta',
    }

    await tester.navigateWithParams(emailLinkParams)
    await tester.waitForDatasetLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(emailLinkParams['dataset-name'])
  })
})
