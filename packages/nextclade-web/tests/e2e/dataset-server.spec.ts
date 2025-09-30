import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS, TEST_INPUT_FILES } from './helpers/url-parameters'

test.describe('Dataset Server URL Parameters', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should handle production dataset server', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://data.clades.nextstrain.org/v3',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('https://data.clades.nextstrain.org/v3')
  })

  test('should handle local dataset server', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'http://localhost:3001',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('http://localhost:3001')
  })

  test('should handle custom dataset server with dataset name and tag', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://data.clades.nextstrain.org/v3',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('https://data.clades.nextstrain.org/v3')
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['dataset-tag']).toBe('2025-09-19--14-53-06Z')
  })

  test('should handle dataset server with input files', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://data.clades.nextstrain.org/v3',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('https://data.clades.nextstrain.org/v3')
    expect(urlParams['input-fasta']).toBe('example')
  })

  test('should handle dataset-url parameter (single dataset)', async () => {
    await tester.navigateWithParams({
      'dataset-url':
        'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2025-09-19--14-53-06Z/',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-url']).toBe(
      'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2025-09-19--14-53-06Z/',
    )
  })

  test('should handle dataset-url with input files', async () => {
    await tester.navigateWithParams({
      'dataset-url':
        'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2025-09-19--14-53-06Z/',
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-url']).toContain('data.clades.nextstrain.org')
    expect(urlParams['input-fasta']).toBe('example')
  })

  test('should prioritize dataset-name over dataset-url when both present', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-url':
        'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2025-09-19--14-53-06Z/',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['dataset-url']).toBe(
      'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2025-09-19--14-53-06Z/',
    )
  })
})
